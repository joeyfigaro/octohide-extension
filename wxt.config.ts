import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: ({ browser }) => ({
    name: "Octohide",
    description:
      "Hide GitHub workflows from the Actions sidebar. Great for keeping reusable/template workflows out of the way.",
    permissions: ["storage"],
    host_permissions: [
      "https://github.com/*",
      "https://raw.githubusercontent.com/*",
      "https://api.github.com/*",
    ],
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "octohide@joeyfigaro",
              data_collection_permissions: { required: ["none"] },
            },
          },
        }
      : {}),
  }),
});
