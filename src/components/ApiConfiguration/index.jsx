import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTileMap } from "../../contexts/TileMapContext";
import { login, getToken } from "../../utils/apiService";
import styles from "./ApiConfiguration.module.css";

export function ApiConfiguration() {
    const { t } = useTranslation();
    const { apiSettings, setApiSettings } = useTileMap();

    const [localUrl,   setLocalUrl]   = useState(apiSettings.url);
    const [localEmail, setLocalEmail] = useState(apiSettings.email);
    const [localSenha, setLocalSenha] = useState("");

    const [status,     setStatus]     = useState(
        apiSettings.conectado ? { tipo: "ok", msg: t("api_connected") } : null
    );
    const [loading,    setLoading]    = useState(false);

    // Reflect token presence when panel opens
    useEffect(() => {
        if (getToken() && !apiSettings.conectado) {
            setApiSettings(prev => ({ ...prev, conectado: true }));
        }
        setStatus(apiSettings.conectado || getToken()
            ? { tipo: "ok", msg: apiSettings.nomeUsuario ? `${t("api_connected_as")} ${apiSettings.nomeUsuario}` : t("api_connected") }
            : null
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSalvar = async () => {
        if (!localEmail || !localSenha) {
            setStatus({ tipo: "error", msg: t("api_fill_fields") });
            return;
        }

        const url = localUrl.trim().replace(/\/$/, "") || "https://api.omaproject.com.br/api";

        setLoading(true);
        setStatus(null);

        try {
            const data = await login(url, localEmail, localSenha);
            setApiSettings({
                url:        url,
                email:      localEmail,
                // senha stays only in React state (localSenha) — not persisted to localStorage
                conectado:  true,
                nomeUsuario: data.usuario.nome,
                idUsuario:  data.usuario.id_usuario,
            });
            setStatus({ tipo: "ok", msg: `${t("api_connected_as")} ${data.usuario.nome}` });
        } catch (err) {
            setApiSettings(prev => ({ ...prev, conectado: false }));
            setStatus({ tipo: "error", msg: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h4 className={styles.title}>{t("api_settings")}</h4>
            <div className={styles.divider} />

            <div className={styles.field}>
                <label className={styles.label}>{t("api_url")}</label>
                <input
                    className={styles.input}
                    type="text"
                    value={localUrl}
                    onChange={e => setLocalUrl(e.target.value)}
                    placeholder="https://api.omaproject.com.br/api"
                />
            </div>

            <div className={styles.field}>
                <label className={styles.label}>{t("api_email")}</label>
                <input
                    className={styles.input}
                    type="email"
                    value={localEmail}
                    onChange={e => setLocalEmail(e.target.value)}
                    placeholder="professor@exemplo.com"
                    autoComplete="off"
                />
            </div>

            <div className={styles.field}>
                <label className={styles.label}>{t("api_password")}</label>
                <input
                    className={styles.input}
                    type="password"
                    value={localSenha}
                    onChange={e => setLocalSenha(e.target.value)}
                />
            </div>

            <button
                className={styles.button}
                onClick={handleSalvar}
                disabled={loading}
            >
                {loading ? t("api_connecting") : t("api_save_connect")}
            </button>

            {status && (
                <p className={`${styles.status} ${status.tipo === "ok" ? styles.statusOk : styles.statusError}`}>
                    {status.tipo === "ok" ? "✔ " : "✖ "}{status.msg}
                </p>
            )}
        </div>
    );
}
