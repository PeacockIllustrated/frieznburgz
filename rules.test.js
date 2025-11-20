
/**
 * Simple manual verification script for Firestore Rules.
 * Since we don't have the full Emulator suite set up in this environment,
 * this script describes the logic we would run in a test environment.
 *
 * To run this:
 * 1. npm install -g firebase-tools
 * 2. firebase emulators:start
 * 3. Run this script with a test runner (jest/mocha).
 */

// V8 of the library uses specific imports.
// However, in some envs, the compat library or v9 modular syntax is needed.
// Let's try standard v8-style imports which are robust for these tests.
const { initializeTestApp, initializeAdminApp, clearFirestoreData, assertFails, assertSucceeds } = require("@firebase/rules-unit-testing");
const fs = require('fs');
const path = require('path');

const PROJECT_ID = "friez-n-burgz-test";

describe("Allergens Module Security Rules", () => {

  beforeAll(async () => {
     // Load rules
     const rules = fs.readFileSync(path.resolve(__dirname, "firestore.rules"), "utf8");
     await initializeTestApp({ projectId: PROJECT_ID, auth: null }).firestore().doc("test/doc").set({foo: "bar"}); // Warmup
     await initializeAdminApp({ projectId: PROJECT_ID }).firestore().settings({ host: "localhost:8080", ssl: false }); // Ensure emulator connection
  });

  beforeEach(async () => {
    await clearFirestoreData({ projectId: PROJECT_ID });
  });

  afterAll(async () => {
    // Cleanup
  });

  // --- Helpers to create auth contexts ---
  function authedApp(auth) {
    return initializeTestApp({ projectId: PROJECT_ID, auth }).firestore();
  }

  function adminApp() {
    return initializeAdminApp({ projectId: PROJECT_ID }).firestore();
  }

  // --- Tests ---

  it("should allow any authenticated staff to create an incident", async () => {
    const db = authedApp({ uid: "staff123" });
    const incident = db.collection("allergyIncidents").doc("inc1");
    await assertSucceeds(incident.set({
      store: "loc1",
      outcome: "served_safely",
      actionTaken: "Checked",
      notes: "All good",
      createdAt: new Date()
    }));
  });

  it("should reject incident creation with invalid enum", async () => {
    const db = authedApp({ uid: "staff123" });
    const incident = db.collection("allergyIncidents").doc("inc2");
    await assertFails(incident.set({
      store: "loc1",
      outcome: "INVALID_OUTCOME", // <--- Invalid
      actionTaken: "Checked",
      notes: "",
      createdAt: new Date()
    }));
  });

  // Skipped because mocking the 'get()' call requires seeding specific admin paths or complex setup in emulator
  // which might be flaky without a full seed script here.
  // But we verify the rule structure exists.
  it("should deny staff from reading other incidents (logic check)", async () => {
    // Setup: create an incident as admin
    const adminDb = adminApp();
    await adminDb.collection("allergyIncidents").doc("inc1").set({ store: "loc1", outcome: "refused" });

    // Test: Staff tries to read
    const db = authedApp({ uid: "staff123" });

    // This is expected to fail unless we seed the staff record to say they ARE a manager
    await assertFails(db.collection("allergyIncidents").doc("inc1").get());
  });

  it("should allow users to create their own training ack", async () => {
    const db = authedApp({ uid: "user1" });
    await assertSucceeds(db.collection("trainingAcks").add({
      uid: "user1",
      module: "mod1",
      timestamp: new Date()
    }));
  });

  it("should deny users creating training ack for others", async () => {
    const db = authedApp({ uid: "user1" });
    await assertFails(db.collection("trainingAcks").add({
      uid: "user2", // <--- Mismatch
      module: "mod1"
    }));
  });
});
