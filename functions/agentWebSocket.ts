Deno.serve((req) => {
  console.log("🔥 AGENT WS HIT 🔥");

  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => console.log("WebSocket opened");
    socket.onmessage = (e) => console.log("Message:", e.data);
    socket.onclose = () => console.log("WebSocket closed");
    socket.onerror = (e) => console.error("WebSocket error:", e);
    
    return response;
  }

  return new Response("ok", { status: 200 });
});