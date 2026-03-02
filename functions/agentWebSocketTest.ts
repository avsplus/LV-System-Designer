// MINIMAL WEBSOCKET TEST HANDLER
// Use this to verify routing and upgrade work without any logic

Deno.serve(async (req) => {
  console.log("🧪 MINIMAL TEST HANDLER HIT 🧪");
  console.log("Request URL:", req.url);
  console.log("Upgrade header:", req.headers.get("upgrade"));
  
  if (req.headers.get("upgrade") === "websocket") {
    console.log("Attempting WebSocket upgrade...");
    
    try {
      const { socket, response } = Deno.upgradeWebSocket(req);
      
      socket.onopen = () => {
        console.log("✅ WebSocket opened successfully");
        socket.send(JSON.stringify({ type: "test", message: "Connection established" }));
      };
      
      socket.onmessage = (event) => {
        console.log("📨 Received message:", event.data);
        socket.send(JSON.stringify({ type: "echo", data: event.data }));
      };
      
      socket.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
      };
      
      socket.onclose = () => {
        console.log("🔌 WebSocket closed");
      };
      
      console.log("✅ Upgrade successful, returning response");
      return response;
    } catch (error) {
      console.error("💥 Upgrade failed:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
  
  return Response.json({ error: "WebSocket upgrade required" }, { status: 400 });
});