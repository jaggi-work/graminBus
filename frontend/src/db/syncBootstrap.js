import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { openDB } from "./localDB";
import { syncAllStaticData } from "./sync";
import { getRoutesFromSQLite } from "./queries";

let syncInProgress = false;

const runSyncSafely = async (db, mode = "background") => {
    if (syncInProgress) return;

    syncInProgress = true;
    try {
        if (mode === "blocking") {
            console.log('starting');
            await syncAllStaticData(db);
        } else {
            // fire-and-forget
            syncAllStaticData(db).catch(err =>
                console.error("Background sync failed:", err)
            );
        }
    } finally {
        syncInProgress = false;
    }
};

export const initStaticDataSync = async () => {
    const db = await openDB();

    /* -----------------------------------------
       1️⃣ FIRST INSTALL CHECK (BLOCKING)
    ----------------------------------------- */
    const routes = await getRoutesFromSQLite();

    if (routes.length === 0) {
        console.log("📦 First install detected → blocking sync");
        await runSyncSafely(db, "blocking");
    } else {
        console.log("⚡ route data already present → background refresh");
        runSyncSafely(db, "background");
    }

    /* -----------------------------------------
       2️⃣ APP FOREGROUND TRIGGER (NON-BLOCKING)
    ----------------------------------------- */
    AppState.addEventListener("change", async state => {
        if (state !== "active") return;

        const net = await NetInfo.fetch();
        if (!net.isConnected || !net.isInternetReachable) return;

        console.log("🔄 App foreground → background sync");
        runSyncSafely(db, "background");
    });
};
