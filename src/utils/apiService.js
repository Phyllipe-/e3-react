/**
 * apiService.js
 * Serviço de comunicação com a api-om.
 * Gerencia token JWT em localStorage e expõe funções de login e upload de mapa.
 */

const LS_TOKEN = "e3_api_token";

export function getToken()       { return localStorage.getItem(LS_TOKEN) || ""; }
       function saveToken(token) { localStorage.setItem(LS_TOKEN, token); }
export function clearToken()     { localStorage.removeItem(LS_TOKEN); }

/**
 * Faz login na api-om e armazena o JWT.
 * @param {string} apiUrl  URL base, ex: "http://127.0.0.1:5000/api"
 * @param {string} email
 * @param {string} senha
 * @returns {Promise<{token: string, usuario: object}>}
 */
export async function login(apiUrl, email, senha) {
    const form = new FormData();
    form.append("email", email);
    form.append("senha", senha);

    const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        body: form,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.erro ?? "Credenciais inválidas.");
    }

    saveToken(data.token);
    return data;
}

function throwSessionExpired() {
    clearToken();
    throw new Error("Sessão expirada. Reconecte na configuração da API.");
}

/**
 * Envia o mapa para a api-om via POST /treinos/mapas.
 */
export async function uploadMapa(apiUrl, nomeMapa, fileString, fileFormat, previewBlob = null, previewFileName = null) {
    const token = getToken();
    if (!token) throwSessionExpired();

    const tipo = fileFormat === "json" ? "application/json" : "text/xml";
    const blob = new Blob([fileString], { type: tipo });
    const fileName = `${nomeMapa || "map"}.${fileFormat}`;

    const form = new FormData();
    form.append("arquivo_mapa", blob, fileName);
    form.append("nome_mapa", nomeMapa || "Mapa sem nome");
    if (previewBlob) {
        form.append("arquivo_preview", previewBlob, previewFileName || `${nomeMapa || "map"}_preview.png`);
    }

    const response = await fetch(`${apiUrl}/treinos/mapas`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });

    if (response.status === 401) throwSessionExpired();

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.erro ?? `Erro ${response.status} ao salvar mapa.`);
    }

    return data;
}

/**
 * Carrega o conteúdo do arquivo XML/JSON de um mapa existente.
 */
export async function carregarMapaArquivo(apiUrl, id) {
    const token = getToken();
    if (!token) throwSessionExpired();

    const response = await fetch(`${apiUrl}/treinos/mapas/${id}/arquivo`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) throwSessionExpired();

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.erro ?? `Erro ${response.status} ao carregar mapa.`);
    }
    return await response.text();
}

/**
 * Atualiza o arquivo de um mapa existente via PATCH (modo edição do E3).
 */
export async function atualizarMapa(apiUrl, idMapa, nomeMapa, fileString, fileFormat, previewBlob = null, previewFileName = null) {
    const token = getToken();
    if (!token) throwSessionExpired();

    const tipo = fileFormat === "json" ? "application/json" : "text/xml";
    const blob = new Blob([fileString], { type: tipo });
    const fileName = `${nomeMapa || "map"}.${fileFormat}`;

    const form = new FormData();
    form.append("arquivo_mapa", blob, fileName);
    if (nomeMapa) form.append("nome_mapa", nomeMapa);
    if (previewBlob) {
        form.append("arquivo_preview", previewBlob, previewFileName || `${nomeMapa || "map"}_preview.png`);
    }

    const response = await fetch(`${apiUrl}/treinos/mapas/${idMapa}/arquivo`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });

    if (response.status === 401) throwSessionExpired();

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.erro ?? `Erro ${response.status} ao atualizar mapa.`);
    }
    return data;
}
