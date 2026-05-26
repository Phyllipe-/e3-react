/**
 * EditModeLoader
 * Lê os parâmetros de URL ?mode=edit&id=<id_mapa>&token=<jwt> e,
 * quando presentes, carrega o mapa na sessão de edição.
 *
 * Não renderiza nada visível — apenas efeito colateral no mount.
 */
import { useEffect } from 'react';
import { useTileMap } from '../../contexts/TileMapContext';
import { carregarMapaArquivo } from '../../utils/apiService';
import { converterXmlParaJson } from '../../utils/converterXmlParaJson';
import { converterJsonParaJson } from '../../utils/converterJsonParaJson';

const LS_TOKEN = "e3_api_token";
const LS_API   = "e3_api_settings";

export function EditModeLoader() {
    const { setTilemap, setEditMapId, setMapName } = useTileMap();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const mode  = params.get('mode');
        const id    = params.get('id');
        const token = params.get('token');

        if (mode !== 'edit' || !id || !token) return;

        // Persiste o token para que apiService.js o encontre
        localStorage.setItem(LS_TOKEN, token);
        setEditMapId(parseInt(id, 10));

        const { url: apiUrl = 'https://api.omaproject.com.br/api' } = (() => {
            try { return JSON.parse(localStorage.getItem(LS_API) || '{}'); }
            catch { return {}; }
        })();

        carregarMapaArquivo(apiUrl, id)
            .then(content => {
                const trimmed = content.trim();
                if (trimmed.startsWith('<')) {
                    // XML
                    setTilemap(converterXmlParaJson(trimmed));
                } else {
                    // JSON
                    const jsonContent = JSON.parse(trimmed);
                    setTilemap(converterJsonParaJson(jsonContent));
                    if (jsonContent.name || jsonContent.nome_mapa) {
                        setMapName(jsonContent.name || jsonContent.nome_mapa);
                    }
                }
            })
            .catch(err => console.error('[E3] Erro ao carregar mapa para edição:', err.message));
    }, []);

    return null;
}
