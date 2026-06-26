const crypto = require('crypto');
const database = require('./database');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch {
    return false;
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function calculateAge(birthdate) {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getAgeGroup(birthdate) {
  const age = calculateAge(birthdate);
  if (age == null) return '';
  if (age < 13) return 'Menor de 13';
  if (age <= 17) return '13-17 anos';
  if (age <= 24) return '18-24 anos';
  if (age <= 34) return '25-34 anos';
  if (age <= 44) return '35-44 anos';
  if (age <= 54) return '45-54 anos';
  return '55+ anos';
}

function sanitizeAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    nick: row.nick,
    email: row.email,
    phone: row.phone || '',
    birthdate: row.birthdate || '',
    ageGroup: getAgeGroup(row.birthdate),
    friendCode: row.friend_code || '',
    registeredAt: row.registered_at,
    updatedAt: row.updated_at,
    avatar: row.avatar || null,
  };
}

async function registerAccount({ nick, email, password, birthdate, phone }) {
  const cleanNick = String(nick || '').trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPhone = normalizePhone(phone);

  if (!cleanNick || cleanNick.length < 2) throw new Error('Apelido inválido');
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Email inválido');
  if (!password || password.length < 6) throw new Error('A senha precisa ter no mínimo 6 caracteres');

  const age = calculateAge(birthdate);
  if (birthdate && age != null && age < 14) throw new Error('Você precisa ter pelo menos 14 anos para se registrar');

  // Verifica email duplicado
  const existing = await database.query('SELECT id FROM accounts WHERE email = $1', [cleanEmail]);
  if (existing.rows.length > 0) throw new Error('Este email já está cadastrado');

  // Verifica nick duplicado (case-insensitive)
  const existingNick = await database.query('SELECT id FROM accounts WHERE LOWER(nick) = LOWER($1)', [cleanNick]);
  if (existingNick.rows.length > 0) throw new Error('Este apelido já está em uso');

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const friendCode = 'ZX-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const passwordHash = hashPassword(password);

  await database.query(
    `INSERT INTO accounts (id, nick, email, phone, birthdate, password_hash, friend_code, registered_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, cleanNick, cleanEmail, cleanPhone, birthdate || '', passwordHash, friendCode, now, now]
  );

  const token = await createSession(id);
  const row = { id, nick: cleanNick, email: cleanEmail, phone: cleanPhone, birthdate: birthdate || '', friend_code: friendCode, registered_at: now, updated_at: now };
  return { account: sanitizeAccount(row), token };
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + 1000 * 60 * 60 * 24 * 30;
  await database.query(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)',
    [token, userId, now, expiresAt]
  );
  return token;
}

async function getSession(token) {
  if (!token) return null;
  const res = await database.query('SELECT * FROM sessions WHERE token = $1', [token]);
  if (res.rows.length === 0) return null;
  const session = res.rows[0];
  if (Date.now() > Number(session.expires_at)) {
    await database.query('DELETE FROM sessions WHERE token = $1', [token]);
    return null;
  }
  return session;
}

async function getAccountByToken(token) {
  const session = await getSession(token);
  if (!session) return null;
  const res = await database.query('SELECT * FROM accounts WHERE id = $1', [session.user_id]);
  return sanitizeAccount(res.rows[0] || null);
}

async function loginAccount({ email, password }) {
  const cleanEmail = normalizeEmail(email);
  const res = await database.query('SELECT * FROM accounts WHERE email = $1', [cleanEmail]);
  if (res.rows.length === 0) throw new Error('Email ou senha incorretos');
  const account = res.rows[0];
  if (!verifyPassword(password, account.password_hash)) throw new Error('Email ou senha incorretos');
  const token = await createSession(account.id);
  return { account: sanitizeAccount(account), token };
}

async function logoutAccount(token) {
  if (!token) return;
  await database.query('DELETE FROM sessions WHERE token = $1', [token]);
}

async function updateAccount(token, updates) {
  const session = await getSession(token);
  if (!session) throw new Error('Sessão expirada. Faça login novamente.');

  const res = await database.query('SELECT * FROM accounts WHERE id = $1', [session.user_id]);
  if (res.rows.length === 0) throw new Error('Conta não encontrada');
  const account = res.rows[0];

  const nextNick = updates.nick != null ? String(updates.nick).trim() : account.nick;
  const nextEmail = updates.email != null ? normalizeEmail(updates.email) : account.email;
  const nextPhone = updates.phone != null ? normalizePhone(updates.phone) : account.phone;
  const nextBirthdate = updates.birthdate != null ? String(updates.birthdate).trim() : account.birthdate;

  if (!nextNick || nextNick.length < 2) throw new Error('Apelido inválido');
  if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) throw new Error('Email inválido');

  if (nextEmail !== account.email) {
    const dup = await database.query('SELECT id FROM accounts WHERE email = $1 AND id != $2', [nextEmail, account.id]);
    if (dup.rows.length > 0) throw new Error('Este email já está em uso');
  }

  if (nextNick !== account.nick) {
    const dupNick = await database.query('SELECT id FROM accounts WHERE LOWER(nick) = LOWER($1) AND id != $2', [nextNick, account.id]);
    if (dupNick.rows.length > 0) throw new Error('Este apelido já está em uso');
  }

  if (nextBirthdate) {
    const age = calculateAge(nextBirthdate);
    if (age != null && age < 14) throw new Error('Você precisa ter pelo menos 14 anos');
  }

  // Avatar: atualizar somente se vier no payload
  const nextAvatar = updates.avatar !== undefined ? (updates.avatar || null) : (account.avatar || null);

  const now = new Date().toISOString();
  await database.query(
    'UPDATE accounts SET nick=$1, email=$2, phone=$3, birthdate=$4, updated_at=$5, avatar=$6 WHERE id=$7',
    [nextNick, nextEmail, nextPhone, nextBirthdate || '', now, nextAvatar, account.id]
  );

  const updated = { ...account, nick: nextNick, email: nextEmail, phone: nextPhone, birthdate: nextBirthdate || '', updated_at: now, avatar: nextAvatar };
  return { account: sanitizeAccount(updated) };
}

async function deleteAccount(token, password) {
  const session = await getSession(token);
  if (!session) throw new Error('Sessão expirada. Faça login novamente.');

  const res = await database.query('SELECT * FROM accounts WHERE id = $1', [session.user_id]);
  if (res.rows.length === 0) throw new Error('Conta não encontrada');
  const account = res.rows[0];
  if (!verifyPassword(password, account.password_hash)) throw new Error('Senha incorreta');

  await database.query('DELETE FROM sessions WHERE user_id = $1', [account.id]);
  await database.query('DELETE FROM accounts WHERE id = $1', [account.id]);
  return sanitizeAccount(account);
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-auth-token'];
  try {
    const session = await getSession(token);
    if (!session) return res.status(401).json({ error: 'Não autenticado' });
    const accRes = await database.query('SELECT * FROM accounts WHERE id = $1', [session.user_id]);
    if (accRes.rows.length === 0) return res.status(401).json({ error: 'Não autenticado' });
    req.authToken = token;
    req.authUserId = session.user_id;
    req.authAccount = sanitizeAccount(accRes.rows[0]);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
}

module.exports = {
  registerAccount,
  loginAccount,
  logoutAccount,
  updateAccount,
  deleteAccount,
  getAccountByToken,
  authMiddleware,
  getAgeGroup,
  calculateAge,
  sanitizeAccount,
};
