# Network Monitoring Architecture

## Overview
Event-driven architecture for reliable device status monitoring with instant updates.

## Flow

### 1. Scheduled Ping Initiation
**Function:** `monitorAgentDevices` (runs every 5 minutes)
- Fetches all agents with `monitoring_enabled: true`
- For each agent, gets their devices and sends ping command
- Returns immediately without waiting for results

### 2. Agent Execution
**Agent Side:**
- Receives `ping_devices` command via WebSocket or polling
- Performs pings on all target IPs
- Calls back to `agentPostEvent` with results

### 3. Agent Callback
**Endpoint:** `agentPostEvent`

**Agent Request:**
```json
POST /agentPostEvent
{
  "agent_id": "865e3c143ad344bb8777174869f3827a",
  "organization_id": "org-123",
  "command_id": "cf77c79c-929a-4621-9082-33ebb7ad890c",
  "event_type": "command_completed",
  "data": {
    "targets": [
      { "ip": "192.168.1.1", "reachable": true, "latency_ms": 5 },
      { "ip": "192.168.1.2", "reachable": false, "latency_ms": null }
    ]
  }
}
```

**What happens:**
- Updates command status to 'completed'
- Stores result in `agent_ping_results` table
- Triggers `processPingResults` asynchronously via HTTP

### 4. Result Processing
**Function:** `processPingResults`
- Fetches ping result from database
- Queries all devices for that agent
- Updates device statuses (online/offline) based on reachability
- Returns summary of updates

## Benefits

✅ **No timeouts** - Monitoring function doesn't wait for results  
✅ **Instant updates** - Devices update as soon as agent reports back  
✅ **Reliable** - Direct Supabase access, no race conditions  
✅ **Scalable** - Handles multiple agents independently  
✅ **Async** - Processing doesn't block agent callbacks  

## Agent Integration

Your agent must:
1. Listen for `ping_devices` commands
2. Execute pings on all targets
3. Call `agentPostEvent` with results when complete

**Example Agent Code:**
```python
def handle_ping_command(command):
    results = ping_all_targets(command['parameters']['targets'])
    
    # Report back to server
    requests.post('https://your-app.base44.com/agentPostEvent', json={
        'agent_id': agent_id,
        'organization_id': org_id,
        'command_id': command['id'],
        'event_type': 'command_completed',
        'data': {
            'targets': results  # [{"ip": "...", "reachable": true/false, "latency_ms": ...}]
        }
    })
```

## Monitoring Flow Diagram

```
┌─────────────────────┐
│ monitorAgentDevices │ (Every 5 min)
└──────────┬──────────┘
           │ 1. Send ping commands
           ▼
    ┌──────────────┐
    │    Agent     │
    │  (Performs   │
    │   pings)     │
    └──────┬───────┘
           │ 2. POST results
           ▼
    ┌──────────────┐
    │agentPostEvent│
    └──────┬───────┘
           │ 3. Store & trigger
           ▼
    ┌──────────────────┐
    │processPingResults│ (Async)
    └──────────────────┘
           │ 4. Update devices
           ▼
    ┌──────────────┐
    │  Device DB   │
    │ (Status=     │
    │  online/     │
    │  offline)    │
    └──────────────┘
``