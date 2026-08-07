import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: ({ browser }) => ({
    name: "Workflow Visibility",
    description:
      "Hide reusable/template GitHub Actions workflows from the Actions sidebar.",
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
              id: "workflow-visibility@the-rogue.agency",
              data_collection_permissions: { required: ["none"] },
            },
          },
        }
      : {}),
  }),
});
