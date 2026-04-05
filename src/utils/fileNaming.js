/**
 * fileNaming.js
 * Gera o nome padronizado dos arquivos exportados.
 *
 * Padrão: {hash6}_{id_professor}_{YYYYMMDD}_{nome_mapa}.{ext}
 * Exemplo: a3f2c1_7_20260401_sala_de_aula.json
 */

/**
 * Hash djb2 simplificado — 6 caracteres hex.
 * Usa o nome do mapa + timestamp para garantir unicidade.
 */
function shortHash(seed) {
    const str = seed + Date.now();
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0;
    }
    return h.toString(16).padStart(8, '0').slice(0, 6);
}

/**
 * Remove acentos, converte espaços/símbolos em `_`, limita a 30 chars.
 */
function sanitizeName(name) {
    return (name || 'mapa')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')   // remove acentos
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')        // não-alfanumérico → _
        .replace(/^_+|_+$/g, '')            // trim underscores
        .slice(0, 30)
        || 'mapa';
}

/**
 * Data atual no formato YYYYMMDD.
 */
function dataHoje() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
}

/**
 * Retorna o nome completo do arquivo.
 *
 * @param {object} apiSettings  — contexto apiSettings (pode estar desconectado)
 * @param {string} mapName      — nome do mapa digitado pelo usuário
 * @param {string} fileFormat   — "json" | "xml"
 * @returns {string}
 */
export function buildFileName(apiSettings, mapName, fileFormat) {
    const hash = shortHash(mapName);
    const id   = apiSettings?.idUsuario ?? 'anon';
    const data = dataHoje();
    const nome = sanitizeName(mapName);
    return `${hash}_${id}_${data}_${nome}.${fileFormat}`;
}
