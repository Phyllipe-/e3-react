import styles from './Menu.module.css'

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTileMap } from '../../contexts/TileMapContext';

import { FaPlus } from "react-icons/fa6";
import { IoMdSave } from "react-icons/io";
import { FaFolderOpen } from "react-icons/fa";
import { IoMenu } from 'react-icons/io5';

import { Modal } from '../Modal';
import { Sidebar } from '../Sidebar';

import { adaptarAppJsonParaE3Map } from '../../utils/adaptador';
import { converterJsonParaXml } from '../../utils/converterJsonParaXml';
import { converterXmlParaJson } from '../../utils/converterXmlParaJson';
import { converterJsonParaJson } from '../../utils/converterJsonParaJson';
import { convertMap } from '../../utils/converter';
import { uploadMapa, atualizarMapa } from '../../utils/apiService';
import { generatePreviewBlob } from '../../utils/previewGenerator';
import { buildFileName } from '../../utils/fileNaming';
import { useSpriteSheetMap } from '../../hook/useSpriteSheetMap';
import { spritesMap } from '../../SpritesMap';

export function Menu(){
    const {t} = useTranslation();

    const download = (fileName, fileFormat, fileString) => {
        const type = fileFormat === 'json' ? 'application/json' : 'application/xml';
        const blob = new Blob([fileString], { type });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const [isModal, setModal] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [fileFormat, setFileFormat] = useState('json');
    const [option, setOption] = useState('save');

    const openModal = (opt) => {
        setModal(true)
        setOption(opt)
        const title = opt === 'save' ? "Salvar Mapa" : "Novo Mapa"
        setModalTitle(title)
    }

    const save = async () => {
        let fileString = '';
        if (fileFormat === 'json') {
            const e3Map = adaptarAppJsonParaE3Map(tilemap);
            const map = convertMap(e3Map);
            fileString = JSON.stringify(map);
        } else {
            fileString = converterJsonParaXml(tilemap);
        }

        const fileName = buildFileName(apiSettings, mapName, fileFormat);

        setModal(false);
        download(fileName, fileFormat, fileString);

        if (apiSettings.conectado && apiSettings.email) {
            setUploadStatus('uploading');
            try {
                const previewBlob = await generatePreviewBlob(tilemap, spriteSheetMap);
                const previewFileName = fileName.replace(/\.[^.]+$/, '.png');

                if (editMapId) {
                    // Modo edição — atualiza mapa existente via PATCH
                    await atualizarMapa(
                        apiSettings.url,
                        editMapId,
                        mapName || 'Mapa sem nome',
                        fileString,
                        fileFormat,
                        previewBlob,
                        previewFileName
                    );
                } else {
                    // Modo criação — cria novo mapa via POST
                    await uploadMapa(
                        apiSettings.url,
                        mapName || 'Mapa sem nome',
                        fileString,
                        fileFormat,
                        previewBlob,
                        previewFileName
                    );
                }
                setUploadStatus('ok');
            } catch (err) {
                setUploadStatus('error');
                console.error('[API] Erro ao salvar mapa:', err.message);
            }
            setTimeout(() => setUploadStatus(null), 4000);
        }
    };

    const target = () => {
        setModal(false)
        window.open(window.location.href, '_blank');
    }

    const handleKey = (e, action) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            action();
        }
    };

    const {
        tilemap, setTilemap,
        setSelectedSprite,
        setSelectedLayerSprite,
        setHistory, history,
        isMenuOpen, setIsMenuOpen, setDisplacementSidebarMenu,
        setIsElementsOpen,
        apiSettings,
        mapName, setMapName,
        editMapId,
    } = useTileMap();

    const [uploadStatus, setUploadStatus] = useState(null);

    const spriteSheetMap = useSpriteSheetMap(spritesMap);

    const handleMenuOpen = () => { setIsMenuOpen(prev => !prev); }

    useEffect(() => {
        if(isMenuOpen) setIsElementsOpen(false);
    }, [isMenuOpen])

    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;

                switch (fileExtension) {
                    case "json":
                        try {
                            const jsonContent = JSON.parse(content);
                            const retorno = converterJsonParaJson(jsonContent);
                            setTilemap(retorno)
                        } 
                        catch (err) {
                            console.error("Erro ao parsear JSON:", err);
                        }
                        break;

                    case "xml":
                        const retorno = converterXmlParaJson(content)
                        setTilemap(retorno)
                        break;

                    default:
                        console.log("Extensão não suportada");
                        break;
                }
            };

            reader.readAsText(file);
        }
        event.target.value = null;
    };

    return(        
        <Sidebar
            title="Menu"
            icon={<IoMenu/>}
            borderTopRightRadiusButton={15}
            borderBottomRightRadiusButton={15}
            borderBottomRightRadiusBody={15}
            positionTop={25}
            active={isMenuOpen}
            toggleSidebar={isMenuOpen}
            onClick={handleMenuOpen}
            setDisplacementSidebar={setDisplacementSidebarMenu}
        >   
            <Modal
                active={isModal}
                setActive={setModal}
                title={modalTitle}
                showButtonClose={false}
                onConfirm={(option === 'save' ? save : target)}
            >
                <div className={styles.contentModal}>
                {option === 'save' ? (
                    <div>
                        <h2 className={styles.titleModal}>{t('save_message')}</h2>
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>
                                {t('map_name')}
                            </label>
                            <input
                                type="text"
                                value={mapName}
                                onChange={e => setMapName(e.target.value)}
                                placeholder={t('map_name')}
                                className={styles.selectTile}
                            />
                        </div>
                        <select onChange={(e) => setFileFormat(e.target.value)} className={styles.selectTile}>
                            <option value="json">JSON</option>
                            <option value="xml">XML</option>
                        </select>
                        {uploadStatus === 'uploading' && (
                            <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '6px' }}>{t('api_connecting')}</p>
                        )}
                        {uploadStatus === 'ok' && (
                            <p style={{ fontSize: '0.8rem', color: '#86efac', marginTop: '6px' }}>✔ {t('api_upload_success')}</p>
                        )}
                        {uploadStatus === 'error' && (
                            <p style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '6px' }}>✖ {t('api_upload_error')}</p>
                        )}
                    </div>
                ) : (
                    <h2 className={styles.titleModal}>Deseja iniciar um novo mapa?</h2>
                )}
                </div>
            </Modal>

            <div aria-label={"menu"} className={styles.menuContainer} role="menubar">
                <div className={styles.divider} style={{marginTop: '-10px'}}></div>
                
                <div 
                    className={styles.menuItem} 
                    onClick={() => openModal("new")}
                    onKeyDown={(e) => handleKey(e, openModal("new"))}
                    role="menuitem"
                    tabIndex={0}
                    aria-label={"novo"}
                >
                    <FaPlus className={styles.menuIcone} />
                    <h3>{t('new')}</h3>
                </div>

                <div className={styles.divider}></div>

                <div 
                    className={styles.menuItem} 
                    onClick={() => openModal("save")}
                    onKeyDown={(e) => handleKey(e, openModal("save"))}
                    role="menuitem"
                    tabIndex={0}
                    aria-label={"salvar"}
                >
                    <IoMdSave className={styles.menuIcone} />
                    <h3>{t('save')}</h3>
                </div>

                <div className={styles.divider}></div>

                <div 
                    className={styles.menuItem} 
                    tabIndex={0}
                    aria-label={"abrir"}
                >
                    <label htmlFor="tile" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <FaFolderOpen className={styles.menuIcone} />
                        <h3>{t('open')}</h3>
                    </label>
                    
                    <input 
                        type="file" 
                        accept=".json, .xml"
                        id="tile" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                        aria-hidden="true"
                        tabIndex={-1}
                    />
                </div>
            </div>
        </Sidebar>
    )
}