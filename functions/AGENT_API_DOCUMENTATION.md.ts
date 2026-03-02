# Network Scanning Agent API Documentation

Complete guide for building a network scanning agent compatible with the AV System Design platform.

## Table of Contents
1. [Overview](#overview)
2. [Registration Flow](#registration-flow)
3. [Authentication & Cryptography](#authentication--cryptography)
4. [Supabase Realtime Connection](#supabase-realtime-connection)
5. [Command Handling](#command-handling)
6. [Event Posting](#event-posting)
7. [Unregistration Flow](#unregistration-flow)
8. [Error Handling](#error-handling)

---

## Overview

The agent is a background service that:
- Registers with the backend using a short-lived registration code
- Maintains a persistent Supabase Realtime WebSocket connection
- Listens for signed commands from the organization
- Executes network scans and posts results back
- Can unregister using two-factor authentication

**Required Libraries:**
- Ed25519 cryptography (signature generation/verification)
- WebSocket client (for Supabase Realtime)
- HTTP client (for REST API calls)
- Network scanning tools (nmap, arp-scan, etc.)

---

## Registration Flow

### Step 1: User Generates Registration Code (Web UI)
- User clicks "Register Agent" in the web app
- Backend generates a short-lived token (30 minutes)
- User receives: `XXXX-XXXX-XXXX-XXXX` format code

### Step 2: Agent Generates Ed25519 Key Pair
```python
# Generate Ed25519 key pair
private_key = ed25519.create_private_key()
public_key = private_key.public_key()

# Export keys as base64
agent_private_key_b64 = base64.b64encode(private_key.to_bytes()).decode()
agent_public_key_b64 = base64.b64encode(public_key.to_bytes()).decode()
```

### Step 3: Exchange Registration Code

**Endpoint:** `POST {backend_url}/exchange-registration-code`

**Request Body:**
```json
{
  "code": "XXXX-XXXX-XXXX-XXXX"
}
```

**Response (200 OK):**
```json
{
  "reg_token": "XXXX-XXXX-XXXX-XXXX",
  "org_id": "uuid",
  "backend_url": "https://...supabase.co/functions/v1",
  "register_agent_url": "https://...supabase.co/functions/v1/register-agent",
  "supabase_realtime_url": "wss://...supabase.co/realtime/v1/websocket",
  "supabase_anon_key": "eyJ...",
  "agent_event_post_url": "https://...supabase.co/functions/v1/agent-post-event",
  "org_public_key": "base64-encoded-org-public-key",
  "expires_at": "2024-12-17T12:00:00Z"
}
```

**Error Responses:**
- `400`: Missing or invalid code
- `404`: Code not found or already used
- `410`: Code expired

### Step 4: Register Agent

**Endpoint:** `POST {register_agent_url}`

**Request Body:**
```json
{
  "reg_token": "XXXX-XXXX-XXXX-XXXX",
  "agent_id": "unique-agent-identifier",
  "agent_public_key": "base64-encoded-public-key",
  "name": "Office Network Scanner",
  "version": "1.0.0"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "agent_id": "unique-agent-identifier",
  "organization_id": "uuid",
  "org_public_key": "base64-encoded-org-public-key"
}
```

**Error Responses:**
- `400`: Missing required fields or invalid token
- `409`: Agent already registered to different organization
- `410`: Registration token expired

### Step 5: Persist Trust Configuration

Save to `trust.json` (or similar):
```json
{
  "agent_id": "unique-agent-identifier",
  "organization_id": "uuid",
  "agent_private_key": "base64-encoded-private-key",
  "agent_public_key": "base64-encoded-public-key",
  "org_public_key": "base64-encoded-org-public-key",
  "backend_url": "https://...supabase.co/functions/v1",
  "supabase_realtime_url": "wss://...supabase.co/realtime/v1/websocket",
  "supabase_anon_key": "eyJ...",
  "agent_event_post_url": "https://...supabase.co/functions/v1/agent-post-event"
}
```

---

## Authentication & Cryptography

### Ed25519 Signature Verification

All commands from the organization are signed with the org's private key. The agent verifies using `org_public_key`.

**Verification Process:**
```python
# Message format for commands
message = f"{command_id}{agent_id}{organization_id}{command_type}{timestamp}"
message_bytes = message.encode('utf-8')

# Verify signature
org_public_key = ed25519.import_public_key_from_base64(trust['org_public_key'])
signature_bytes = base64.b64decode(command['signature'])

is_valid = org_public_key.verify(signature_bytes, message_bytes)
```

### Signing Agent Responses

When the agent needs to prove its identity (e.g., unregister), it signs with its private key:

```python
# Message to sign
message = f"{agent_id}{organization_id}{unregister_token}{timestamp}"
message_bytes = message.encode('utf-8')

# Sign with agent's private key
agent_private_key = ed25519.import_private_key_from_base64(trust['agent_private_key'])
signature_bytes = agent_private_key.sign(message_bytes)
signature_b64 = base64.b64encode(signature_bytes).decode()
```

---

## Supabase Realtime Connection

### Connection Setup

**WebSocket URL:**
```
wss://{project-ref}.supabase.co/realtime/v1/websocket?apikey={supabase_anon_key}&vsn=1.0.0
```

### Phoenix Channel Protocol

Supabase uses Phoenix WebSocket protocol. Messages are JSON arrays:

**Join Request:**
```json
[
  "1",
  "1",
  "realtime:agent_commands:{organization_id}",
  "phx_join",
  {
    "config": {
      "broadcast": {"self": false},
      "presence": {"key": ""},
      "postgres_changes": [
        {
          "event": "INSERT",
          "schema": "public",
          "table": "agent_commands",
          "filter": "organization_id=eq.{organization_id}"
        }
      ]
    }
  }
]
```

**Heartbeat (every 30 seconds):**
```json
["2", "2", "phoenix", "heartbeat", {}]
```

**Incoming Command Message:**
```json
[
  null,
  null,
  "realtime:agent_commands:{organization_id}",
  "postgres_changes",
  {
    "data": {
      "schema": "public",
      "table": "agent_commands",
      "commit_timestamp": "2024-12-17T12:00:00Z",
      "eventType": "INSERT",
      "new": {
        "id": "uuid",
        "organization_id": "uuid",
        "agent_id": "target-agent-id-or-null",
        "command_type": "scan_network",
        "parameters": {
          "subnet": "192.168.1.0/24"
        },
        "status": "pending",
        "timestamp": "2024-12-17T12:00:00Z",
        "signature": "base64-signature"
      },
      "old": {}
    }
  }
]
```

### Command Filtering

Only process commands where:
1. `agent_id` is `null` (broadcast) OR matches your `agent_id`
2. Signature verification passes
3. Timestamp is within acceptable window (±5 minutes)

---

## Command Handling

### Command Structure

```json
{
  "id": "command-uuid",
  "organization_id": "org-uuid",
  "agent_id": "agent-uuid-or-null",
  "command_type": "scan_network",
  "parameters": {
    "subnet": "192.168.1.0/24",
    "scan_type": "quick"
  },
  "status": "pending",
  "timestamp": "2024-12-17T12:00:00.000Z",
  "signature": "base64-encoded-signature"
}
```

### Signature Verification

```python
def verify_command_signature(command, org_public_key):
    message = (
        f"{command['id']}"
        f"{command['agent_id'] or ''}"
        f"{command['organization_id']}"
        f"{command['command_type']}"
        f"{command['timestamp']}"
    )
    message_bytes = message.encode('utf-8')
    signature_bytes = base64.b64decode(command['signature'])
    
    return org_public_key.verify(signature_bytes, message_bytes)
```

### Command Types

#### 1. `scan_network`
**Parameters:**
```json
{
  "subnet": "192.168.1.0/24",
  "scan_type": "quick|full"
}
```

**Actions:**
- Scan the specified subnet for devices
- Discover: IP, MAC, hostname, vendor, ports (if full scan)
- Post progress events periodically
- Post final results

#### 2. `heartbeat`
**Parameters:** None

**Actions:**
- Immediately post a status event
- Update `last_seen` timestamp

#### 3. `update_config`
**Parameters:**
```json
{
  "scan_interval": 3600,
  "auto_scan": true
}
```

**Actions:**
- Update local configuration
- Acknowledge with event

---

## Event Posting

### Endpoint
**POST** `{agent_event_post_url}`

### Event Structure

```json
{
  "agent_id": "agent-uuid",
  "organization_id": "org-uuid",
  "command_id": "related-command-uuid-or-null",
  "event_type": "heartbeat|scan_progress|scan_complete|device_found|error",
  "data": {
    // Event-specific payload
  }
}
```

### Event Types

#### 1. `heartbeat`
```json
{
  "event_type": "heartbeat",
  "data": {
    "status": "online",
    "version": "1.0.0",
    "uptime_seconds": 3600
  }
}
```

#### 2. `scan_progress`
```json
{
  "event_type": "scan_progress",
  "command_id": "scan-command-uuid",
  "data": {
    "progress": 45,
    "total_hosts": 254,
    "scanned_hosts": 114,
    "devices_found": 12
  }
}
```

#### 3. `device_found`
```json
{
  "event_type": "device_found",
  "command_id": "scan-command-uuid",
  "data": {
    "ip_address": "192.168.1.100",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "hostname": "office-printer",
    "vendor": "HP Inc.",
    "device_type": "printer",
    "ports": [80, 443, 9100],
    "os": "Linux 3.x"
  }
}
```

#### 4. `scan_complete`
```json
{
  "event_type": "scan_complete",
  "command_id": "scan-command-uuid",
  "data": {
    "total_devices": 25,
    "duration_seconds": 120,
    "subnet": "192.168.1.0/24"
  }
}
```

#### 5. `error`
```json
{
  "event_type": "error",
  "command_id": "related-command-uuid-or-null",
  "data": {
    "error_type": "scan_failed",
    "message": "Permission denied: requires root/sudo",
    "details": "..."
  }
}
```

### Response
**200 OK:**
```json
{
  "success": true
}
```

---

## Unregistration Flow

### Step 1: User Generates Unregister Token (Web UI)
- User clicks unregister button for specific agent
- Backend generates unregister confirmation code: `XXXX-XXXX-XXXX` (15 min expiry)
- User copies code to agent

### Step 2: Agent Signs Unregister Request

```python
# Get current timestamp
timestamp = int(time.time())

# Build message
message = f"{agent_id}{organization_id}{unregister_token}{timestamp}"
message_bytes = message.encode('utf-8')

# Sign with agent's private key
signature_bytes = agent_private_key.sign(message_bytes)
signature_b64 = base64.b64encode(signature_bytes).decode()
```

### Step 3: Send Unregister Request

**Endpoint:** `POST {backend_url}/unregisterAgent`

**Request Body:**
```json
{
  "agent_id": "agent-uuid",
  "organization_id": "org-uuid",
  "unregister_token": "XXXX-XXXX-XXXX",
  "timestamp": 1734403200,
  "signature": "base64-signature"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**
- `400`: Invalid or expired token, missing fields
- `403`: Invalid signature or token not valid for this agent
- `404`: Agent not found

### Step 4: Local Cleanup
- Delete `trust.json`
- Close WebSocket connection
- Clear all stored state

---

## Error Handling

### Retry Logic

**Network Errors:**
- Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
- Retry indefinitely for critical operations (registration, event posting)

**WebSocket Disconnection:**
- Reconnect immediately on first disconnect
- Exponential backoff on subsequent failures
- Re-subscribe to channels after reconnect

### Signature Verification Failures
- Log error with command details
- Do NOT execute command
- Post error event to backend
- Continue processing other commands

### Timestamp Validation
- Accept commands within ±5 minutes of system time
- Reject and log if outside window
- Post warning event if clock drift detected

---

## Reference Implementation Pseudocode

```python
class NetworkAgent:
    def __init__(self):
        self.trust = None
        self.ws = None
        self.running = False
        
    def register(self, registration_code):
        # Generate keys
        private_key = ed25519.generate_key()
        public_key = private_key.public_key()
        
        # Exchange code
        response = http_post(
            f"{BASE_URL}/exchange-registration-code",
            {"code": registration_code}
        )
        config = response.json()
        
        # Register agent
        response = http_post(
            config['register_agent_url'],
            {
                "reg_token": config['reg_token'],
                "agent_id": generate_unique_id(),
                "agent_public_key": base64_encode(public_key),
                "name": "My Agent",
                "version": "1.0.0"
            }
        )
        
        # Save trust config
        self.trust = {
            **config,
            "agent_id": response['agent_id'],
            "agent_private_key": base64_encode(private_key),
            "agent_public_key": base64_encode(public_key)
        }
        save_json("trust.json", self.trust)
        
    def connect_websocket(self):
        url = f"{self.trust['supabase_realtime_url']}?apikey={self.trust['supabase_anon_key']}&vsn=1.0.0"
        self.ws = websocket.connect(url)
        
        # Join channel
        self.ws.send(json.dumps([
            "1", "1",
            f"realtime:agent_commands:{self.trust['organization_id']}",
            "phx_join",
            {
                "config": {
                    "postgres_changes": [{
                        "event": "INSERT",
                        "schema": "public",
                        "table": "agent_commands",
                        "filter": f"organization_id=eq.{self.trust['organization_id']}"
                    }]
                }
            }
        ]))
        
        # Start heartbeat thread
        threading.Thread(target=self.heartbeat_loop).start()
        
    def heartbeat_loop(self):
        ref = 2
        while self.running:
            self.ws.send(json.dumps([str(ref), str(ref), "phoenix", "heartbeat", {}]))
            ref += 1
            time.sleep(30)
            
    def handle_message(self, msg):
        data = json.loads(msg)
        if data[3] == "postgres_changes":
            command = data[4]['data']['new']
            
            # Filter by agent_id
            if command['agent_id'] and command['agent_id'] != self.trust['agent_id']:
                return
                
            # Verify signature
            if not self.verify_signature(command):
                self.post_event("error", {"error": "Invalid signature"})
                return
                
            # Execute command
            self.execute_command(command)
            
    def verify_signature(self, command):
        message = (
            f"{command['id']}"
            f"{command['agent_id'] or ''}"
            f"{command['organization_id']}"
            f"{command['command_type']}"
            f"{command['timestamp']}"
        )
        org_public_key = ed25519.import_key(self.trust['org_public_key'])
        signature = base64.b64decode(command['signature'])
        return org_public_key.verify(signature, message.encode())
        
    def execute_command(self, command):
        if command['command_type'] == 'scan_network':
            self.scan_network(command)
        elif command['command_type'] == 'heartbeat':
            self.post_event("heartbeat", {"status": "online"})
            
    def scan_network(self, command):
        subnet = command['parameters']['subnet']
        
        # Post start event
        self.post_event("scan_progress", {
            "progress": 0,
            "subnet": subnet
        }, command['id'])
        
        # Perform scan
        devices = perform_network_scan(subnet)
        
        # Post device events
        for device in devices:
            self.post_event("device_found", device, command['id'])
            
        # Post completion
        self.post_event("scan_complete", {
            "total_devices": len(devices),
            "subnet": subnet
        }, command['id'])
        
    def post_event(self, event_type, data, command_id=None):
        http_post(
            self.trust['agent_event_post_url'],
            {
                "agent_id": self.trust['agent_id'],
                "organization_id": self.trust['organization_id'],
                "command_id": command_id,
                "event_type": event_type,
                "data": data
            }
        )
        
    def unregister(self, unregister_token):
        timestamp = int(time.time())
        message = (
            f"{self.trust['agent_id']}"
            f"{self.trust['organization_id']}"
            f"{unregister_token}"
            f"{timestamp}"
        )
        
        private_key = ed25519.import_key(self.trust['agent_private_key'])
        signature = private_key.sign(message.encode())
        
        http_post(
            f"{self.trust['backend_url']}/unregisterAgent",
            {
                "agent_id": self.trust['agent_id'],
                "organization_id": self.trust['organization_id'],
                "unregister_token": unregister_token,
                "timestamp": timestamp,
                "signature": base64.b64encode(signature).decode()
            }
        )
        
        # Cleanup
        os.remove("trust.json")
        self.ws.close()
        self.running = False
        
    def run(self):
        self.running = True
        self.connect_websocket()
        
        while self.running:
            msg = self.ws.recv()
            if msg:
                self.handle_message(msg)
```

---

## Security Considerations

1. **Store Private Keys Securely**
   - Encrypt `trust.json` with system keyring
   - Use file permissions (chmod 600)
   - Never log private keys

2. **Validate All Timestamps**
   - Reject commands with timestamps > ±5 minutes
   - Use NTP to keep system time accurate

3. **Rate Limiting**
   - Limit command processing to prevent DoS
   - Throttle event posting

4. **Network Scanning Permissions**
   - Run with minimal required privileges
   - Sanitize all command parameters
   - Validate subnet ranges

5. **Secure WebSocket Connection**
   - Always use WSS (TLS)
   - Validate server certificate
   - Handle connection errors gracefully

---

## Testing Checklist

- [ ] Registration with valid code
- [ ] Registration with expired code
- [ ] Registration with invalid code
- [ ] WebSocket connection establishment
- [ ] WebSocket reconnection after disconnect
- [ ] Command signature verification (valid)
- [ ] Command signature verification (invalid)
- [ ] Command execution (scan_network)
- [ ] Command execution (heartbeat)
- [ ] Event posting (all types)
- [ ] Timestamp validation (within window)
- [ ] Timestamp validation (outside window)
- [ ] Unregistration with valid token
- [ ] Unregistration with expired token
- [ ] Unregistration with invalid signature
- [ ] Clock drift handling
- [ ] Network error retry logic
- [ ] Concurrent command handling

---

## Support

For issues or questions:
- Check agent logs for detailed error messages
- Verify trust.json contains valid keys
- Test connectivity to Supabase endpoints
- Ensure system time is accurate (NTP)
- Check firewall rules for WebSocket connections