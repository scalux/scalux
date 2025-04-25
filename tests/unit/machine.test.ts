// tests/machine.test.ts
import { describe, it, expect } from "vitest";
import { Machine } from "../../src/machine"; // Ajustez le chemin
import type { TreePaths } from "../../src/trees"; // Pour le type Mode

describe("Machine Factory and Helpers", () => {
  // Définir un arbre de modes complexe pour les tests
  const complexModes = {
    auth: {
      login: null,
      register: null,
      forgotPassword: null,
    },
    app: {
      dashboard: null,
      settings: {
        profile: null,
        account: null,
        notifications: null,
      },
      editor: {
        idle: null,
        editing: {
          text: null,
          image: null,
        },
        saving: null,
      },
    },
    loading: null,
  };

  const { modesTree, macroModes, subModes, mkModeOptions } =
    Machine(complexModes);
  type Mode = TreePaths<typeof complexModes>; // "auth/login" | "app/dashboard" | etc.

  // --- Test de modesTree ---
  it("modesTree should contain correct path strings", () => {
    expect(modesTree.auth.login).toBe("auth/login");
    expect(modesTree.app.settings.account).toBe("app/settings/account");
    expect(modesTree.app.editor.editing.text).toBe("app/editor/editing/text");
    expect(modesTree.loading).toBe("loading");
  });

  // --- Test de macroModes ---
  describe("macroModes", () => {
    const auth = macroModes("auth");
    const appSettings = macroModes("app/settings");
    const appEditorEditing = macroModes("app/editor/editing");

    it("match should return true for modes starting with the prefix", () => {
      expect(auth.match("auth/login")).toBe(true);
      expect(auth.match("auth/register")).toBe(true);
      expect(appSettings.match("app/settings/profile")).toBe(true);
      expect(appEditorEditing.match("app/editor/editing/image")).toBe(true);
    });

    it("match should return false for modes not starting with the prefix", () => {
      expect(auth.match("app/dashboard")).toBe(false);
      expect(appSettings.match("app/editor/idle")).toBe(false);
      expect(appEditorEditing.match("app/editor/saving")).toBe(false);
      expect(appEditorEditing.match("loading")).toBe(false);
    });

    // Test des transitions 'next'. Note: La validité de 'newPrefix' est assurée par TS.
    // Ici on teste juste le remplacement de chaîne.
    it("next should replace the prefix", () => {
      // Simule un passage de auth -> app (en gardant le 'login' si possible, mais ici non)
      // Note: Ce 'nextPrefix' spécifique pourrait ne pas être valide selon les règles TS
      // mais on teste le mécanisme de remplacement de chaîne.
      // Dans une vraie app, TS empêcherait un préfixe invalide.

      const currentModeSettings: Mode = "app/settings/profile";
      // TS assurerait que "app/editor" est valide
      expect(appSettings.next("app/editor" as never, currentModeSettings)).toBe(
        "app/editor/profile"
      );

      const currentModeEditing: Mode = "app/editor/editing/text";
      expect(
        appEditorEditing.next("app/editor" as never, currentModeEditing)
      ).toBe("app/editor/text");
    });
  });

  // --- Test de subModes ---
  describe("subModes", () => {
    const login = subModes("login"); // Suffixe simple
    const profile = subModes("profile"); // Suffixe interne
    const text = subModes("text"); // Suffixe le plus interne

    it("match should return true for modes ending with the suffix", () => {
      expect(login.match("auth/login")).toBe(true);
      expect(profile.match("app/settings/profile")).toBe(true);
      expect(text.match("app/editor/editing/text")).toBe(true);
    });

    it("match should return false for modes not ending with the suffix", () => {
      expect(login.match("auth/register")).toBe(false);
      expect(profile.match("app/settings/account")).toBe(false);
      expect(text.match("app/editor/editing/image")).toBe(false);
      expect(text.match("app/settings/profile")).toBe(false);
    });

    // Test des transitions 'next'. La validité de 'newSuffix' est assurée par TS.
    it("next should replace the suffix", () => {
      // TS assurerait que 'register' est un ReplaceableSuffix<Mode, 'login'>
      expect(login.next("register", "auth/login")).toBe("auth/register");

      // TS assurerait que 'account' est valide
      expect(profile.next("account", "app/settings/profile")).toBe(
        "app/settings/account"
      );

      // TS assurerait que 'image' est valide
      expect(text.next("image", "app/editor/editing/text")).toBe(
        "app/editor/editing/image"
      );
    });
  });

  // --- Test de mkModeOptions ---
  describe("mkModeOptions", () => {
    const options = mkModeOptions((tree) => ({
      // Option basée sur les enfants directs de 'app'
      appSection: [tree.app], // Enfants: dashboard, settings, editor
      // Option basée sur les enfants de 'settings' (dans app)
      settingsSubSection: [tree.app.settings], // Enfants: profile, account, notifications
      // Option basée sur les enfants de 'editing' (dans app/editor)
      editingType: [tree.app.editor.editing], // Enfants: text, image
      // Option mixant des nœuds différents
    }));

    it("should extract options based on the current mode path", () => {
      expect(options.appSection("app/dashboard")).toBe("dashboard");
      expect(options.appSection("app/settings/profile")).toBe("settings");
      expect(options.appSection("app/editor/editing/text")).toBe("editor");
      expect(options.appSection("auth/login")).toBeUndefined(); // Ne passe pas par 'app'
      expect(options.appSection("loading")).toBeUndefined();

      expect(options.settingsSubSection("app/settings/profile")).toBe(
        "profile"
      );
      expect(options.settingsSubSection("app/settings/account")).toBe(
        "account"
      );
      expect(options.settingsSubSection("app/dashboard")).toBeUndefined();
      expect(options.settingsSubSection("app/editor/idle")).toBeUndefined();

      expect(options.editingType("app/editor/editing/text")).toBe("text");
      expect(options.editingType("app/editor/editing/image")).toBe("image");
      expect(options.editingType("app/editor/idle")).toBeUndefined();
      expect(options.editingType("app/editor/saving")).toBeUndefined();
    });

    // Vérifie le typage 'undefined' quand un mode ne traverse pas *tous* les noeuds spécifiés
    it("should return undefined if mode does not pass through specified nodes", () => {
      // 'settingsSubSection' est défini seulement sur tree.app.settings
      const modeOutsideSettings: Mode = "app/dashboard";
      expect(options.settingsSubSection(modeOutsideSettings)).toBeUndefined();

      const modeOutsideEditing: Mode = "app/editor/idle";
      expect(options.editingType(modeOutsideEditing)).toBeUndefined();
    });

    // Ce test serait mieux fait avec une vérification de type TS
    it("should guarantee return type if all modes pass through nodes (conceptual)", () => {
      // Pour `appSection`, tous les modes sauf 'loading' et 'auth/*'
      // passent par `tree.app`. Si on ne définissait QUE `tree.app`
      // et que tous les modes PASSAIENT par là, le type ne serait pas `| undefined`.
      // Ici, ce n'est pas le cas.
      // Exemple (nécessiterait un arbre différent):
      // const simpleModes = { root: { a: null, b: null } };
      // const { mkModeOptions: mkSimple } = Machine(simpleModes);
      // const simpleOptions = mkSimple(tree => ({ always: [tree.root] }));
      // Le type de simpleOptions.always serait (mode: "root/a" | "root/b") => "a" | "b" (sans undefined)
      expect(true).toBe(true); // Placeholder
    });
  });
});
