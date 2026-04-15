import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, ".", "");
    var proxyTarget = env.VITE_DEV_PROXY_TARGET || env.VITE_API_BASE_URL || "http://localhost:8080";
    return {
        plugins: [react()],
        server: {
            port: 3000,
            proxy: {
                "/auth/status": proxyTarget,
                "/auth/user": proxyTarget,
                "/auth/login": proxyTarget,
                "/auth/register": proxyTarget,
                "/auth/logout": proxyTarget,
                "/api": proxyTarget,
                "/oauth2": proxyTarget,
                "/login": proxyTarget
            }
        }
    };
});
