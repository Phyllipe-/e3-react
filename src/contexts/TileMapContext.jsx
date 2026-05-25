import {
    createContext,
    useContext,
    useState,
    useEffect
} from 'react';
import { getToken, login } from '../utils/apiService';

const LS_API = "e3_api_settings";
const LS_MAP_NAME = "e3_map_name";

function loadApiSettings() {
    try {
        const saved = localStorage.getItem(LS_API);
        if (saved) return JSON.parse(saved);
    } catch (_) {}
    return { url: "https://api.omaproject.com.br/api", email: "", senha: "", conectado: false, nomeUsuario: "" };
}

const TileMapContext = createContext();

export function TileMapProvider({ children }) {
    const [
        isMenuOpen, 
        setIsMenuOpen
    ] = useState(false);

    const [
        isElementsOpen, 
        setIsElementsOpen
    ] = useState(false);

    const [
        isAttributesOpen, 
        setIsAttributesOpen
    ] = useState(false);

    const [
        isHelpOpen, 
        setIsHelpOpen
    ] = useState(false);

    const [
        isDisplayOpen, 
        setIsDisplayOpen
    ] = useState(false);

    const [
        displacementSidebarMenu, 
        setDisplacementSidebarMenu
    ] = useState(0);

    const [
        displacementSidebarHelp, 
        setDisplacementSidebarHelp
    ] = useState(0);

    const [
        displacementSidebarDisplay, 
        setDisplacementSidebarDisplay
    ] = useState(0);

    const [
        selectedCategory, 
        setSelectedCategory
    ] = useState(null);

    const [
        selectedSprite, 
        setSelectedSprite
    ] = useState({});

    const [
        selectedLayerSprite, 
        setSelectedLayerSprite
    ] = useState(null);

    const [
        selectedLayer, 
        setSelectedLayer
    ] = useState(null);

    const [
        history, 
        setHistory
    ] = useState([]);

    const [
        settingsOpen, 
        setSettingsOpen
    ] = useState(false);

    const [
        hoverCell,
        setHoverCell
    ] = useState(null);

    const [apiSettings, setApiSettingsState] = useState(loadApiSettings);
    const [mapName, setMapName] = useState(
        () => localStorage.getItem(LS_MAP_NAME) || ""
    );
    const [editMapId, setEditMapId] = useState(null);

    const setApiSettings = (value) => {
        const next = typeof value === "function" ? value(apiSettings) : value;
        setApiSettingsState(next);
        try { localStorage.setItem(LS_API, JSON.stringify(next)); } catch (_) {}
    };

    useEffect(() => {
        try { localStorage.setItem(LS_MAP_NAME, mapName); } catch (_) {}
    }, [mapName]);

    // Auto-connect on startup: if credentials are saved and no token exists, login silently
    useEffect(() => {
        const { url, email, senha, conectado } = apiSettings;
        if (!email || !senha) return;
        if (getToken()) {
            if (!conectado) setApiSettings(prev => ({ ...prev, conectado: true }));
            return;
        }
        login(url, email, senha)
            .then(data => {
                setApiSettings(prev => ({
                    ...prev,
                    conectado:   true,
                    nomeUsuario: data.usuario?.nome  ?? prev.nomeUsuario,
                    idUsuario:   data.usuario?.id_usuario ?? prev.idUsuario,
                }));
            })
            .catch(() => {
                // Silently ignore — user will see "not connected" in ApiConfiguration
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [
        tilemap, 
        setTilemap
    ] = useState({
        width: 5,
        height: 5,
        tileSize: 32,
        spriteSheetPath: '',
        layers: [
            { 
                id: 'floor', 
                name: 'Pisos', 
                visible: true, 
                sprites: [] 
            },
            { 
                id: 'walls', 
                name: 'Paredes', 
                visible: true, 
                sprites: [] 
            },
            { 
                id: 'door_and_windows', 
                name: 'Portas e Janelas', 
                visible: true, 
                sprites: [] 
            },
            { 
                id: 'furniture', 
                name: 'Móveis',
                visible: true, 
                sprites: [] 
            },
            { 
                id: 'utensils', 
                name: 'Utensílios', 
                visible: true, 
                sprites: [] 
            },
            { 
                id: 'eletronics', 
                name: 'Eletrodomésticos', 
                visible: true, 
                sprites: [] 
            },
            { 
                id: 'interactive_elements', 
                name: 'Elementos Interativos', 
                visible: true, 
                sprites: [] 
            },
            { 
                id: 'persons', 
                name: 'Pessoa', 
                visible: true, 
                sprites: [] 
            },
        ],
    });

    return (
        <TileMapContext.Provider value = {
            {
                isMenuOpen, 
                setIsMenuOpen,
                isElementsOpen, 
                setIsElementsOpen,
                isAttributesOpen, 
                setIsAttributesOpen,
                isHelpOpen, 
                setIsHelpOpen,
                isDisplayOpen, 
                setIsDisplayOpen,
                displacementSidebarMenu, 
                setDisplacementSidebarMenu,
                displacementSidebarDisplay, 
                setDisplacementSidebarDisplay,
                displacementSidebarHelp, 
                setDisplacementSidebarHelp,
                selectedCategory, 
                setSelectedCategory,
                selectedSprite, 
                setSelectedSprite,
                selectedLayer, 
                setSelectedLayer,
                selectedLayerSprite, 
                setSelectedLayerSprite,
                settingsOpen, 
                setSettingsOpen,
                hoverCell, 
                setHoverCell,
                history, 
                setHistory,
                tilemap,
                setTilemap,
                apiSettings,
                setApiSettings,
                mapName,
                setMapName,
                editMapId,
                setEditMapId,
            }
        }>
            {children}
        </TileMapContext.Provider>
    )
}

export function useTileMap() {
    const context = useContext(TileMapContext);
    if (!context) {
        throw new Error(`
            useTilemap deve ser usado dentro de TilemapProvider
        `);
    }
    return context;
}