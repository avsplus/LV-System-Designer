{
  "exportDataSchema": {
    "version": "1.0",
    "description": "All available data variables for PDF export",
    
    "projectInfo": {
      "projectName": "string - Name of the project",
      "clientName": "string - Client/customer name (optional)",
      "location": "string - Project location/address (optional)",
      "generatedDate": "string - Date the PDF was generated"
    },
    
    "organizationSettings": {
      "organization_name": "string - Company name",
      "logo_url": "string - URL to company logo",
      "primary_color": "string - Hex color code (e.g., #3b82f6)",
      "secondary_color": "string - Hex color code",
      "export_template": {
        "include_logo": "boolean - Include logo in export",
        "include_pricing": "boolean - Include pricing information",
        "include_network_info": "boolean - Include network details",
        "header_text": "string - Custom header text",
        "footer_text": "string - Custom footer text"
      }
    },
    
    "statistics": {
      "totalDevices": "number - Total count of devices on canvas",
      "totalConnections": "number - Total count of connections",
      "totalRooms": "number - Total count of rooms"
    },
    
    "rooms": [
      "string - Room name (e.g., 'Living Room', 'Master Bedroom')"
    ],
    
    "canvasProducts": [
      {
        "instanceId": "string - Unique identifier for this device instance",
        "label": "string - Device label (e.g., 'Sony 1', 'Denon 2')",
        "room": "string - Room assignment",
        "position": {
          "x": "number - X coordinate on canvas",
          "y": "number - Y coordinate on canvas"
        },
        "networkInfo": {
          "sw": "string - Switch number",
          "port": "string - Port number",
          "ip": "string - IP address (e.g., '192.168.1.100')",
          "mac": "string - MAC address (e.g., '00:1A:2B:3C:4D:5E')"
        },
        "product": {
          "id": "string - Product database ID",
          "brand": "string - Manufacturer name",
          "model": "string - Model name/number",
          "category": "string - Device category (see categories list)",
          "description": "string - Product description",
          "price": "number - Product price (optional)",
          "image_url": "string - Product image URL",
          "specs": {
            "power": "string - Power specifications",
            "impedance": "string - Impedance rating",
            "frequency_response": "string - Frequency range",
            "connectivity": "string - Connectivity options",
            "dimensions": "string - Physical dimensions",
            "weight": "string - Product weight"
          },
          "input_connections": [
            {
              "type": "string - Connection type (see connectionTypes)",
              "ports": ["string - Port names (e.g., 'HDMI-1', 'HDMI-2')"]
            }
          ],
          "output_connections": [
            {
              "type": "string - Connection type",
              "ports": ["string - Port names"]
            }
          ],
          "control": {
            "ip": "boolean - Supports IP control",
            "rs232": "boolean - Supports RS232 control",
            "ir": "boolean - Supports IR control",
            "trigger": "boolean - Supports trigger control",
            "protocols": ["string - Supported protocols"]
          }
        }
      }
    ],
    
    "connections": [
      {
        "wireId": "string - Wire identifier (e.g., 'V001', 'A002', 'N003')",
        "type": "string - Connection type (see connectionTypes)",
        "from": "string - Source device instanceId",
        "to": "string - Destination device instanceId",
        "fromPort": "string - Source port name",
        "toPort": "string - Destination port name",
        "waypoints": [
          {
            "x": "number - Waypoint X coordinate",
            "y": "number - Waypoint Y coordinate"
          }
        ]
      }
    ],
    
    "enums": {
      "categories": [
        "televisions",
        "projectors",
        "projector_screens",
        "video_distribution",
        "matrix_switchers",
        "audio_streamers",
        "media_streamers",
        "speakers",
        "soundbars",
        "subwoofers",
        "stereo_amps",
        "multizone_amps",
        "surround_processors",
        "av_receivers",
        "network_switches",
        "control_processors",
        "hdmi_extenders"
      ],
      
      "connectionTypes": [
        "HDMI",
        "HDBaseT",
        "Component",
        "Composite",
        "VGA",
        "Optical",
        "TOSLINK",
        "RCA",
        "XLR",
        "Speaker Wire",
        "Coaxial",
        "Subwoofer",
        "3.5mm Jack",
        "Wireless",
        "Ethernet",
        "USB",
        "RS232",
        "IR",
        "Control",
        "Power"
      ],
      
      "wireIdPrefixes": {
        "V": "Video connections (HDMI, HDBaseT, Component, Composite, VGA)",
        "A": "Audio connections (Optical, RCA, XLR, Speaker Wire, Coaxial, Subwoofer, 3.5mm Jack, Wireless)",
        "N": "Network connections (Ethernet, USB)",
        "C": "Control connections (RS232, Control)",
        "P": "Power connections"
      }
    },
    
    "derivedData": {
      "description": "Data calculated during export from the above sources",
      
      "devicesByRoom": {
        "description": "Devices grouped by room name",
        "structure": {
          "[roomName]": ["array of canvasProducts in this room"]
        }
      },
      
      "connectionsByDevice": {
        "description": "Connections grouped by device",
        "structure": {
          "[instanceId]": {
            "inputs": ["connections where this device is the destination"],
            "outputs": ["connections where this device is the source"]
          }
        }
      },
      
      "billOfMaterials": {
        "description": "Devices aggregated by brand/model",
        "structure": [
          {
            "brand": "string",
            "model": "string",
            "category": "string",
            "quantity": "number",
            "unitPrice": "number",
            "totalPrice": "number",
            "rooms": ["string - rooms where this product is used"]
          }
        ]
      },
      
      "cableSchedule": {
        "description": "Formatted connection list for installation",
        "structure": [
          {
            "wireId": "string",
            "type": "string",
            "sourceDevice": "string - device label",
            "sourcePort": "string",
            "sourceRoom": "string",
            "destDevice": "string - device label",
            "destPort": "string",
            "destRoom": "string"
          }
        ]
      }
    }
  }
}