import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Workflow Visibility",
    description:
      "Hide reusable/template GitHub Actions workflows from the Actions sidebar.",
    permissions: ["storage"],
    host_permissions: [
      "https://github.com/*",
      "https://raw.githubusercontent.com/*",
    ],
  },
});
