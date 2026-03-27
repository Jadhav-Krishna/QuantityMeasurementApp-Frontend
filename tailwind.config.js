/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"]
      },
      boxShadow: {
        auth: "0 30px 80px rgba(30, 41, 59, 0.16)",
        panel: "0 18px 45px rgba(37, 99, 235, 0.12)"
      },
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          400: "#5d84ff",
          500: "#4a6cf7",
          600: "#3953e9",
          700: "#2740cf"
        }
      }
    }
  },
  plugins: []
};
