// vite.config.ts
import react from "file:///workspaces/site-iconluxury.group/frontend/node_modules/@vitejs/plugin-react-swc/index.mjs";
import { TanStackRouterVite } from "file:///workspaces/site-iconluxury.group/frontend/node_modules/@tanstack/router-vite-plugin/dist/esm/index.js";
import { defineConfig } from "file:///workspaces/site-iconluxury.group/frontend/node_modules/vite/dist/node/index.js";
import { nodePolyfills } from "file:///workspaces/site-iconluxury.group/frontend/node_modules/vite-plugin-node-polyfills/dist/index.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
var __vite_injected_original_import_meta_url = "file:///workspaces/site-iconluxury.group/frontend/vite.config.ts";
var polyfillAliases = Object.fromEntries(
  ["buffer", "global", "process"].map((shim) => [
    `vite-plugin-node-polyfills/shims/${shim}`,
    fileURLToPath(
      new URL(`./node_modules/vite-plugin-node-polyfills/shims/${shim}/dist/index.js`, __vite_injected_original_import_meta_url)
    )
  ])
);
var rootDir = fileURLToPath(new URL(".", __vite_injected_original_import_meta_url));
var vite_config_default = defineConfig({
  plugins: [
    react(),
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts"
    }),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true
      }
    })
  ],
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
      ...polyfillAliases
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis"
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvd29ya3NwYWNlcy9zaXRlLWljb25sdXh1cnkuZ3JvdXAvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi93b3Jrc3BhY2VzL3NpdGUtaWNvbmx1eHVyeS5ncm91cC9mcm9udGVuZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vd29ya3NwYWNlcy9zaXRlLWljb25sdXh1cnkuZ3JvdXAvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djJztcbmltcG9ydCB7IFRhblN0YWNrUm91dGVyVml0ZSB9IGZyb20gJ0B0YW5zdGFjay9yb3V0ZXItdml0ZS1wbHVnaW4nO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgeyBub2RlUG9seWZpbGxzIH0gZnJvbSAndml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnO1xuXG4vLyBSZXNvbHZlIHRoZSBwb2x5ZmlsbCBzaGltcyB0byBhYnNvbHV0ZSBwYXRocyBzbyBSb2xsdXAgY2FuIGJ1bmRsZSB0aGVtIHJlbGlhYmx5XG5jb25zdCBwb2x5ZmlsbEFsaWFzZXMgPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gIFsnYnVmZmVyJywgJ2dsb2JhbCcsICdwcm9jZXNzJ10ubWFwKChzaGltKSA9PiBbXG4gICAgYHZpdGUtcGx1Z2luLW5vZGUtcG9seWZpbGxzL3NoaW1zLyR7c2hpbX1gLFxuICAgIGZpbGVVUkxUb1BhdGgoXG4gICAgICBuZXcgVVJMKGAuL25vZGVfbW9kdWxlcy92aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxscy9zaGltcy8ke3NoaW19L2Rpc3QvaW5kZXguanNgLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICksXG4gIF0pLFxuKSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuXG5jb25zdCByb290RGlyID0gZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuJywgaW1wb3J0Lm1ldGEudXJsKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIFRhblN0YWNrUm91dGVyVml0ZSh7XG4gICAgICByb3V0ZXNEaXJlY3Rvcnk6ICcuL3NyYy9yb3V0ZXMnLFxuICAgICAgZ2VuZXJhdGVkUm91dGVUcmVlOiAnLi9zcmMvcm91dGVUcmVlLmdlbi50cycsXG4gICAgfSksXG4gICAgbm9kZVBvbHlmaWxscyh7XG4gICAgICBnbG9iYWxzOiB7XG4gICAgICAgIEJ1ZmZlcjogdHJ1ZSxcbiAgICAgICAgZ2xvYmFsOiB0cnVlLFxuICAgICAgICBwcm9jZXNzOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KSxcbiAgXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHJlc29sdmUocm9vdERpciwgJ3NyYycpLFxuICAgICAgLi4ucG9seWZpbGxBbGlhc2VzLFxuICAgIH0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGVzYnVpbGRPcHRpb25zOiB7XG4gICAgICBkZWZpbmU6IHtcbiAgICAgICAgZ2xvYmFsOiAnZ2xvYmFsVGhpcycsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQWdULE9BQU8sV0FBVztBQUNsVSxTQUFTLDBCQUEwQjtBQUNuQyxTQUFTLG9CQUFvQjtBQUM3QixTQUFTLHFCQUFxQjtBQUM5QixTQUFTLGVBQWU7QUFDeEIsU0FBUyxxQkFBcUI7QUFMOEosSUFBTSwyQ0FBMkM7QUFRN08sSUFBTSxrQkFBa0IsT0FBTztBQUFBLEVBQzdCLENBQUMsVUFBVSxVQUFVLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztBQUFBLElBQzVDLG9DQUFvQyxJQUFJO0FBQUEsSUFDeEM7QUFBQSxNQUNFLElBQUksSUFBSSxtREFBbUQsSUFBSSxrQkFBa0Isd0NBQWU7QUFBQSxJQUNsRztBQUFBLEVBQ0YsQ0FBQztBQUNIO0FBRUEsSUFBTSxVQUFVLGNBQWMsSUFBSSxJQUFJLEtBQUssd0NBQWUsQ0FBQztBQUUzRCxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixtQkFBbUI7QUFBQSxNQUNqQixpQkFBaUI7QUFBQSxNQUNqQixvQkFBb0I7QUFBQSxJQUN0QixDQUFDO0FBQUEsSUFDRCxjQUFjO0FBQUEsTUFDWixTQUFTO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixRQUFRO0FBQUEsUUFDUixTQUFTO0FBQUEsTUFDWDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssUUFBUSxTQUFTLEtBQUs7QUFBQSxNQUMzQixHQUFHO0FBQUEsSUFDTDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLGdCQUFnQjtBQUFBLE1BQ2QsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
