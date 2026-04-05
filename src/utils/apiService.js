/**
 * apiService.js
 * Serviço de comunicação com a api-om.
 * Gerencia token JWT em localStorage e expõe funções de login e upload de mapa.
 */

const LS_TOKEN = "e3_api_token";

function getToken()          { return localStorage.getItem(LS_TOKEN) || ""; }
function saveToken(token)    { localStorage.setItem(LS_TOKEN, token); }
function clearToken()        { localStorage.removeItem(LS_TOKEN); }

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

/**
 * Envia o mapa para a api-om via POST /treinos/mapas.
 * Se receber 401, tenta renovar o token com as credenciais salvas e reenvia.
 *
 * @param {string} apiUrl      URL base
 * @param {string} email       Para renovação automática do token
 * @param {string} senha       Para renovação automática do token
 * @param {string} nomeMapa    Nome do mapa a registrar
 * @param {string} fileString  Conteúdo do arquivo (JSON ou XML)
 * @param {string} fileFormat  "json" | "xml"
 * @returns {Promise<object>}  Resposta da API
 */
export async function uploadMapa(apiUrl, email, senha, nomeMapa, fileString, fileFormat, previewBlob = null, previewFileName = null) {
    const token = getToken();
    if (!token) {
        await login(apiUrl, email, senha);
        return uploadMapa(apiUrl, email, senha, nomeMapa, fileString, fileFormat, previewBlob, previewFileName);
    }

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

    if (response.status === 401) {
        clearToken();
        await login(apiUrl, email, senha);
        return uploadMapa(apiUrl, email, senha, nomeMapa, fileString, fileFormat, previewBlob, previewFileName);
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.erro ?? `Erro ${response.status} ao salvar mapa.`);
    }

    return data;
}
