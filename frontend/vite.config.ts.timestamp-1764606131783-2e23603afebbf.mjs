// vite.config.ts
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TanStackRouterVite } from "file:///workspaces/site-iconluxury.group/frontend/node_modules/@tanstack/router-vite-plugin/dist/esm/index.js";
import react from "file:///workspaces/site-iconluxury.group/frontend/node_modules/@vitejs/plugin-react-swc/index.mjs";
import { defineConfig } from "file:///workspaces/site-iconluxury.group/frontend/node_modules/vite/dist/node/index.js";
import { nodePolyfills } from "file:///workspaces/site-iconluxury.group/frontend/node_modules/vite-plugin-node-polyfills/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///workspaces/site-iconluxury.group/frontend/vite.config.ts";
var polyfillAliases = Object.fromEntries(
  ["buffer", "global", "process"].map((shim) => [
    `vite-plugin-node-polyfills/shims/${shim}`,
    fileURLToPath(
      new URL(
        `./node_modules/vite-plugin-node-polyfills/shims/${shim}/dist/index.js`,
        __vite_injected_original_import_meta_url
      )
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvd29ya3NwYWNlcy9zaXRlLWljb25sdXh1cnkuZ3JvdXAvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi93b3Jrc3BhY2VzL3NpdGUtaWNvbmx1eHVyeS5ncm91cC9mcm9udGVuZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vd29ya3NwYWNlcy9zaXRlLWljb25sdXh1cnkuZ3JvdXAvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyByZXNvbHZlIH0gZnJvbSBcIm5vZGU6cGF0aFwiXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSBcIm5vZGU6dXJsXCJcbmltcG9ydCB7IFRhblN0YWNrUm91dGVyVml0ZSB9IGZyb20gXCJAdGFuc3RhY2svcm91dGVyLXZpdGUtcGx1Z2luXCJcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCJcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgfSBmcm9tIFwidml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHNcIlxuXG4vLyBSZXNvbHZlIHRoZSBwb2x5ZmlsbCBzaGltcyB0byBhYnNvbHV0ZSBwYXRocyBzbyBSb2xsdXAgY2FuIGJ1bmRsZSB0aGVtIHJlbGlhYmx5XG5jb25zdCBwb2x5ZmlsbEFsaWFzZXMgPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gIFtcImJ1ZmZlclwiLCBcImdsb2JhbFwiLCBcInByb2Nlc3NcIl0ubWFwKChzaGltKSA9PiBbXG4gICAgYHZpdGUtcGx1Z2luLW5vZGUtcG9seWZpbGxzL3NoaW1zLyR7c2hpbX1gLFxuICAgIGZpbGVVUkxUb1BhdGgoXG4gICAgICBuZXcgVVJMKFxuICAgICAgICBgLi9ub2RlX21vZHVsZXMvdml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvc2hpbXMvJHtzaGltfS9kaXN0L2luZGV4LmpzYCxcbiAgICAgICAgaW1wb3J0Lm1ldGEudXJsLFxuICAgICAgKSxcbiAgICApLFxuICBdKSxcbikgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuXG5jb25zdCByb290RGlyID0gZmlsZVVSTFRvUGF0aChuZXcgVVJMKFwiLlwiLCBpbXBvcnQubWV0YS51cmwpKVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBUYW5TdGFja1JvdXRlclZpdGUoe1xuICAgICAgcm91dGVzRGlyZWN0b3J5OiBcIi4vc3JjL3JvdXRlc1wiLFxuICAgICAgZ2VuZXJhdGVkUm91dGVUcmVlOiBcIi4vc3JjL3JvdXRlVHJlZS5nZW4udHNcIixcbiAgICB9KSxcbiAgICBub2RlUG9seWZpbGxzKHtcbiAgICAgIGdsb2JhbHM6IHtcbiAgICAgICAgQnVmZmVyOiB0cnVlLFxuICAgICAgICBnbG9iYWw6IHRydWUsXG4gICAgICAgIHByb2Nlc3M6IHRydWUsXG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiByZXNvbHZlKHJvb3REaXIsIFwic3JjXCIpLFxuICAgICAgLi4ucG9seWZpbGxBbGlhc2VzLFxuICAgIH0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGVzYnVpbGRPcHRpb25zOiB7XG4gICAgICBkZWZpbmU6IHtcbiAgICAgICAgZ2xvYmFsOiBcImdsb2JhbFRoaXNcIixcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdULFNBQVMsZUFBZTtBQUN4VSxTQUFTLHFCQUFxQjtBQUM5QixTQUFTLDBCQUEwQjtBQUNuQyxPQUFPLFdBQVc7QUFDbEIsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyxxQkFBcUI7QUFMOEosSUFBTSwyQ0FBMkM7QUFRN08sSUFBTSxrQkFBa0IsT0FBTztBQUFBLEVBQzdCLENBQUMsVUFBVSxVQUFVLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztBQUFBLElBQzVDLG9DQUFvQyxJQUFJO0FBQUEsSUFDeEM7QUFBQSxNQUNFLElBQUk7QUFBQSxRQUNGLG1EQUFtRCxJQUFJO0FBQUEsUUFDdkQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0YsQ0FBQztBQUNIO0FBRUEsSUFBTSxVQUFVLGNBQWMsSUFBSSxJQUFJLEtBQUssd0NBQWUsQ0FBQztBQUUzRCxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixtQkFBbUI7QUFBQSxNQUNqQixpQkFBaUI7QUFBQSxNQUNqQixvQkFBb0I7QUFBQSxJQUN0QixDQUFDO0FBQUEsSUFDRCxjQUFjO0FBQUEsTUFDWixTQUFTO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixRQUFRO0FBQUEsUUFDUixTQUFTO0FBQUEsTUFDWDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssUUFBUSxTQUFTLEtBQUs7QUFBQSxNQUMzQixHQUFHO0FBQUEsSUFDTDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLGdCQUFnQjtBQUFBLE1BQ2QsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
