/**
 * Sistema de Gerenciamento de Comunidades
 * Implementa todas as funcionalidades solicitadas
 * 
 * IDS UTILIZADOS:
 * - Botão Criar Comunidade: #btnCriarComunidade
 * - Modal: #modalCriarComunidade
 * - Campo Nome: #nomeComunidade
 * - Campo Descrição: #descricaoComunidade
 * - Botão Salvar: #btnSalvarComunidade
 * - Botão Cancelar: #btnCancelarComunidade
 * - Lista Minhas Comunidades: #minhasComunidades
 * - Lista Comunidades Sugeridas: #comunidadesSugeridas
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const btnCriarComunidade = document.getElementById('btnCriarComunidade');
    const modal = document.getElementById('modalCriarComunidade');
    const btnSalvar = document.getElementById('btnSalvarComunidade');
