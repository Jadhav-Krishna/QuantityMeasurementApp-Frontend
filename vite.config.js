import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            "/auth/status": "http://localhost:8080",
            "/auth/user": "http://localhost:8080",
            "/auth/login": "http://localhost:8080",
            "/auth/register": "http://localhost:8080",
            "/auth/logout": "http://localhost:8080",
            "/api": "http://localhost:8080",
            "/oauth2": "http://localhost:8080",
            "/login": "http://localhost:8080"
        }
    }
});
