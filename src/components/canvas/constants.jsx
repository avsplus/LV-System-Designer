// Category abbreviations for device labels
export const CATEGORY_ABBREVIATIONS = {
  televisions: 'TV',
  projectors: 'PJ',
  projector_screens: 'SCR',
  video_distribution: 'VD',
  matrix_switchers: 'MX',
  audio_streamers: 'AS',
  media_streamers: 'MS',
  speakers: 'SPK',
  soundbars: 'SB',
  subwoofers: 'SUB',
  stereo_amps: 'AMP',
  multizone_amps: 'MZA',
  surround_processors: 'SP',
  av_receivers: 'AVR',
  network_switches: 'SW',
  control_processors: 'CP',
  hdmi_extenders: 'EXT',
  power_conditioner: 'PC',
  smart_power_conditioner: 'SPC',
  power_strip: 'PS',
  ups_backup: 'UPS'
};

// Connection type categories for wire ID prefixes
export const CONNECTION_CATEGORIES = {
  'HDMI': 'V',
  'HDBaseT': 'V',
  'Component': 'V',
  'Composite': 'V',
  'VGA': 'V',
  'Optical': 'A',
  'Optical/TOSLINK': 'A',
  'RCA': 'A',
  'XLR': 'A',
  'Speaker Wire': 'A',
  'Coaxial': 'A',
  'Subwoofer': 'A',
  '3.5mm Jack': 'A',
  'Wireless': 'A',
  'Ethernet': 'N',
  'USB': 'N',
  'RS232': 'C',
  'Control': 'C',
  'Power': 'P'
};

// Card dimensions for canvas products
export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 280;
export const PORT_DOT_SIZE = 20;
export const PORT_GAP = 12;
export const PORT_HIT_RADIUS = 50;
export const PORT_OFFSET = 20;

// Connections by category (default port configurations)
export const CONNECTIONS_BY_CATEGORY = {
  televisions: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4"] },
      { type: "Component", ports: ["Component-1"] },
      { type: "Composite", ports: ["Composite-1"] },
      { type: "Optical", ports: ["Optical-In"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "IR", ports: ["IR-In"] }
    ],
    outputs: [
      { type: "Optical", ports: ["Optical-Out"] },
      { type: "3.5mm Jack", ports: ["Headphone"] }
    ]
  },
  projectors: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2"] },
      { type: "VGA", ports: ["VGA"] },
      { type: "Component", ports: ["Component-1"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "IR", ports: ["IR-In"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "3.5mm Jack", ports: ["Audio-Out"] }
    ]
  },
  projector_screens: {
    inputs: [
      { type: "Control", ports: ["Trigger-1", "Trigger-2"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: []
  },
  video_distribution: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "IR", ports: ["IR-In"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2", "HDMI-Out-3", "HDMI-Out-4", "HDMI-Out-5", "HDMI-Out-6"] },
      { type: "HDBaseT", ports: ["HDBaseT-1", "HDBaseT-2", "HDBaseT-3", "HDBaseT-4"] }
    ]
  },
  matrix_switchers: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4", "HDMI-5", "HDMI-6", "HDMI-7", "HDMI-8"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2", "HDMI-Out-3", "HDMI-Out-4", "HDMI-Out-5", "HDMI-Out-6", "HDMI-Out-7", "HDMI-Out-8"] }
    ]
  },
  audio_streamers: {
    inputs: [
      { type: "Ethernet", ports: ["LAN"] },
      { type: "USB", ports: ["USB"] },
      { type: "Optical", ports: ["Optical-In"] },
      { type: "IR", ports: ["IR-In"] }
    ],
    outputs: [
      { type: "RCA", ports: ["Out-L", "Out-R"] },
      { type: "Optical", ports: ["Optical-Out"] },
      { type: "Coaxial", ports: ["Coaxial-Out"] },
      { type: "XLR", ports: ["XLR-L", "XLR-R"] }
    ]
  },
  media_streamers: {
    inputs: [
      { type: "Ethernet", ports: ["LAN"] },
      { type: "USB", ports: ["USB"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out"] }
    ]
  },
  speakers: {
    inputs: [
      { type: "Speaker Wire", ports: ["Input"] }
    ],
    outputs: []
  },
  soundbars: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2"] },
      { type: "Optical", ports: ["Optical-In"] },
      { type: "RCA", ports: ["RCA-L", "RCA-R"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "IR", ports: ["IR-In"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out"] },
      { type: "Subwoofer", ports: ["Sub-Out"] }
    ]
  },
  subwoofers: {
    inputs: [
      { type: "Subwoofer", ports: ["Input"] }
    ],
    outputs: []
  },
  stereo_amps: {
    inputs: [
      { type: "RCA", ports: ["RCA-1", "RCA-2"] },
      { type: "XLR", ports: ["XLR-L", "XLR-R"] },
      { type: "Optical", ports: ["Optical-1"] },
      { type: "Coaxial", ports: ["Coaxial"] },
      { type: "IR", ports: ["IR-In"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: ["Speaker-L", "Speaker-R"] },
      { type: "RCA", ports: ["Pre-Out-L", "Pre-Out-R"] }
    ]
  },
  multizone_amps: {
    inputs: [
      { type: "RCA", ports: ["Zone-1-L", "Zone-1-R", "Zone-2-L", "Zone-2-R", "Zone-3-L", "Zone-3-R", "Zone-4-L", "Zone-4-R"] },
      { type: "XLR", ports: ["XLR-1-L", "XLR-1-R", "XLR-2-L", "XLR-2-R"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "IR", ports: ["IR-In"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: ["Zone-1-L", "Zone-1-R", "Zone-2-L", "Zone-2-R", "Zone-3-L", "Zone-3-R", "Zone-4-L", "Zone-4-R"] }
    ]
  },
  surround_processors: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4", "HDMI-5", "HDMI-6", "HDMI-7"] },
      { type: "RCA", ports: ["RCA-1", "RCA-2"] },
      { type: "XLR", ports: ["XLR-L", "XLR-R"] },
      { type: "Optical", ports: ["Optical-1", "Optical-2"] },
      { type: "Coaxial", ports: ["Coaxial-1"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2"] },
      { type: "RCA", ports: ["FL", "FR", "C", "SL", "SR", "SBL", "SBR", "Sub"] },
      { type: "XLR", ports: ["XLR-FL", "XLR-FR", "XLR-C", "XLR-SL", "XLR-SR", "XLR-Sub"] }
    ]
  },
  av_receivers: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-1", "HDMI-2", "HDMI-3", "HDMI-4", "HDMI-5", "HDMI-6", "HDMI-7"] },
      { type: "RCA", ports: ["CD", "Phono", "AUX-1", "AUX-2"] },
      { type: "Optical", ports: ["Optical-1", "Optical-2"] },
      { type: "Coaxial", ports: ["Coaxial"] },
      { type: "USB", ports: ["USB-A", "USB-B"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out-1", "HDMI-Out-2"] },
      { type: "Speaker Wire", ports: ["Front-L", "Front-R", "Center", "Surround-L", "Surround-R", "Surround-Back-L", "Surround-Back-R", "Sub-1", "Sub-2"] },
      { type: "RCA", ports: ["Zone-2-L", "Zone-2-R"] },
      { type: "Optical", ports: ["Optical-Out"] }
    ]
  },
  network_switches: {
    inputs: [
      { type: "Ethernet", ports: ["Uplink-1", "Uplink-2"] }
    ],
    outputs: [
      { type: "Ethernet", ports: ["Port-1", "Port-2", "Port-3", "Port-4", "Port-5", "Port-6", "Port-7", "Port-8"] }
    ]
  },
  control_processors: {
    inputs: [
      { type: "Ethernet", ports: ["LAN-1", "LAN-2"] },
      { type: "RS232", ports: ["COM-1", "COM-2", "COM-3", "COM-4"] },
      { type: "IR", ports: ["IR-1", "IR-2", "IR-3", "IR-4"] },
      { type: "USB", ports: ["USB-A", "USB-B"] }
    ],
    outputs: [
      { type: "RS232", ports: ["COM-1", "COM-2", "COM-3", "COM-4"] },
      { type: "IR", ports: ["IR-1", "IR-2", "IR-3", "IR-4"] },
      { type: "Control", ports: ["Relay-1", "Relay-2", "Relay-3", "Relay-4"] }
    ]
  },
  hdmi_extenders: {
    inputs: [
      { type: "HDMI", ports: ["HDMI-In"] },
      { type: "Ethernet", ports: ["LAN-In", "Cat6-In"] },
      { type: "IR", ports: ["IR-In"] },
      { type: "RS232", ports: ["RS232-In"] }
    ],
    outputs: [
      { type: "HDMI", ports: ["HDMI-Out"] },
      { type: "Ethernet", ports: ["LAN-Out", "Cat6-Out"] },
      { type: "IR", ports: ["IR-Out"] },
      { type: "RS232", ports: ["RS232-Out"] }
    ]
  },
  power_conditioner: {
    inputs: [
      { type: "Power", ports: ["AC-In"] }
    ],
    outputs: [
      { type: "Power", ports: ["Outlet-1", "Outlet-2", "Outlet-3", "Outlet-4", "Outlet-5", "Outlet-6"] }
    ]
  },
  smart_power_conditioner: {
    inputs: [
      { type: "Power", ports: ["AC-In"] },
      { type: "Ethernet", ports: ["LAN"] },
      { type: "RS232", ports: ["RS232"] }
    ],
    outputs: [
      { type: "Power", ports: ["Outlet-1", "Outlet-2", "Outlet-3", "Outlet-4", "Outlet-5", "Outlet-6"] }
    ]
  },
  power_strip: {
    inputs: [
      { type: "Power", ports: ["AC-In"] }
    ],
    outputs: [
      { type: "Power", ports: ["Outlet-1", "Outlet-2", "Outlet-3", "Outlet-4", "Outlet-5", "Outlet-6", "Outlet-7", "Outlet-8"] }
    ]
  },
  ups_backup: {
    inputs: [
      { type: "Power", ports: ["AC-In"] },
      { type: "Ethernet", ports: ["LAN"] }
    ],
    outputs: [
      { type: "Power", ports: ["Battery-1", "Battery-2", "Battery-3", "Battery-4", "Surge-1", "Surge-2"] }
    ]
  }
};