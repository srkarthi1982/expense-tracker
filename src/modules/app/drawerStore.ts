import type { Alpine } from "alpinejs";
import { AvBaseStore } from "@ansiversa/components/alpine";

export type DrawerKey = "createTransaction" | "editTransaction";

export class AppDrawerStore extends AvBaseStore {
  activeDrawer: DrawerKey | null = null;

  open(drawerKey: DrawerKey) {
    this.activeDrawer = drawerKey;
  }

  close() {
    this.activeDrawer = null;
  }
}

export const registerAppDrawerStore = (Alpine: Alpine) => {
  Alpine.store("appDrawer", new AppDrawerStore());
};
