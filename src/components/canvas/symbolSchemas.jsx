// Symbol specification schemas - defines all configurable properties per symbol type
export const symbolSchemas = {
  // Network Devices
  data_outlet: {
    category: 'Communications',
    label: 'Data Outlet',
    ui: {
      visualTriggers: ['ports', 'faceplateOrientation', 'color'],
      showHeightLabel: true,
      showPortCount: true,
      allowRotation: false
    },
    defaults: {
      specs: {
        ports: 2,
        portTypes: ['Cat6', 'Cat6'],
        faceplateOrientation: 'vertical',
        color: 'white'
      },
      installation: {
        height: 18,
        heightType: 'AFF',
        mounting: 'surface'
      }
    },
    specs: {
      ports: {
        type: 'number',
        label: 'Number of Ports',
        min: 1,
        max: 8,
        step: 1,
        validate: { adaWarningBelow: 0 }
      },
      portTypes: {
        type: 'array',
        label: 'Port Types',
        options: ['Cat6', 'Cat6A', 'Fiber', 'HDMI', 'USB', 'Power'],
        dependsOn: 'ports',
        lengthMatches: 'ports'
      },
      faceplateOrientation: {
        type: 'select',
        label: 'Orientation',
        options: ['vertical', 'horizontal']
      },
      color: {
        type: 'select',
        label: 'Color',
        options: ['white', 'black', 'gray', 'stainless']
      }
    },
    installation: {
      height: {
        type: 'number',
        label: 'Height',
        min: 0,
        max: 120,
        step: 1,
        validate: { adaWarningBelow: 15, adaWarningAbove: 48 }
      },
      heightType: {
        type: 'select',
        label: 'Height Reference',
        options: ['AFF', 'FFL']
      },
      mounting: {
        type: 'select',
        label: 'Mounting',
        options: ['surface', 'recessed']
      }
    },
    costModel: {
      laborHours: 0.5,
      materialMultiplier: 1.0,
      dependsOn: ['ports']
    }
  },

  touch_panel: {
    category: 'Control',
    label: 'Touch Panel',
    ui: {
      visualTriggers: ['screenSize', 'orientation'],
      showHeightLabel: true,
      showScreenSize: true,
      allowRotation: true
    },
    defaults: {
      specs: {
        screenSize: 7,
        orientation: 'portrait',
        brightness: 'high'
      },
      installation: {
        height: 48,
        heightType: 'AFF',
        mounting: 'recessed'
      }
    },
    specs: {
      screenSize: {
        type: 'select',
        label: 'Screen Size',
        options: [5, 7, 10, 12, 15]
      },
      orientation: {
        type: 'select',
        label: 'Orientation',
        options: ['portrait', 'landscape']
      },
      brightness: {
        type: 'select',
        label: 'Brightness',
        options: ['low', 'medium', 'high']
      }
    },
    installation: {
      height: {
        type: 'number',
        label: 'Height',
        min: 0,
        max: 120,
        step: 1,
        validate: { adaWarningBelow: 15, adaWarningAbove: 54 }
      },
      heightType: {
        type: 'select',
        label: 'Height Reference',
        options: ['AFF', 'FFL']
      },
      mounting: {
        type: 'select',
        label: 'Mounting',
        options: ['recessed', 'surface', 'flush']
      }
    },
    costModel: {
      laborHours: 2.0,
      materialMultiplier: 1.5,
      dependsOn: ['screenSize']
    }
  },

  speaker: {
    category: 'Audio/Video',
    label: 'Speaker',
    ui: {
      visualTriggers: ['power'],
      showHeightLabel: true,
      allowRotation: true
    },
    defaults: {
      specs: {
        impedance: '8',
        power: '100W',
        frequency: '50-20kHz'
      },
      installation: {
        height: 84,
        heightType: 'AFF',
        mounting: 'wall'
      }
    },
    specs: {
      impedance: {
        type: 'select',
        label: 'Impedance',
        options: ['4', '8', '16']
      },
      power: {
        type: 'select',
        label: 'Power Handling',
        options: ['50W', '100W', '200W', '300W']
      },
      frequency: {
        type: 'text',
        label: 'Frequency Response'
      }
    },
    installation: {
      height: {
        type: 'number',
        label: 'Height',
        min: 0,
        max: 120,
        step: 1,
        validate: { adaWarningBelow: 15 }
      },
      heightType: {
        type: 'select',
        label: 'Height Reference',
        options: ['AFF', 'FFL']
      },
      mounting: {
        type: 'select',
        label: 'Mounting',
        options: ['wall', 'ceiling', 'shelf']
      }
    },
    costModel: {
      laborHours: 1.0,
      materialMultiplier: 0.8,
      dependsOn: ['power']
    }
  },

  projector: {
    category: 'Video',
    label: 'Projector',
    defaults: {
      specs: {
        brightness: '3000 ANSI',
        resolution: '1080p',
        throwRatio: 'standard'
      },
      installation: {
        height: 96,
        heightType: 'AFF',
        mounting: 'ceiling'
      }
    },
    specs: {
      brightness: {
        type: 'select',
        label: 'Brightness',
        options: ['2000 ANSI', '3000 ANSI', '5000 ANSI', '8000 ANSI']
      },
      resolution: {
        type: 'select',
        label: 'Resolution',
        options: ['720p', '1080p', '4K']
      },
      throwRatio: {
        type: 'select',
        label: 'Throw Ratio',
        options: ['standard', 'short-throw', 'ultra-short']
      }
    },
    installation: {
      height: {
        type: 'number',
        label: 'Height',
        min: 0,
        max: 120,
        step: 1
      },
      heightType: {
        type: 'select',
        label: 'Height Reference',
        options: ['AFF', 'FFL']
      },
      mounting: {
        type: 'select',
        label: 'Mounting',
        options: ['ceiling', 'wall']
      }
    }
  },

  tv_display: {
    category: 'Video',
    label: 'TV Display',
    defaults: {
      specs: {
        screenSize: 55,
        resolution: '4K',
        orientation: 'landscape'
      },
      installation: {
        height: 60,
        heightType: 'AFF',
        mounting: 'wall'
      }
    },
    specs: {
      screenSize: {
        type: 'select',
        label: 'Screen Size',
        options: [32, 43, 50, 55, 65, 75, 85]
      },
      resolution: {
        type: 'select',
        label: 'Resolution',
        options: ['1080p', '4K', '8K']
      },
      orientation: {
        type: 'select',
        label: 'Orientation',
        options: ['portrait', 'landscape']
      }
    },
    installation: {
      height: {
        type: 'number',
        label: 'Height',
        min: 0,
        max: 120,
        step: 1
      },
      heightType: {
        type: 'select',
        label: 'Height Reference',
        options: ['AFF', 'FFL']
      },
      mounting: {
        type: 'select',
        label: 'Mounting',
        options: ['wall', 'stand', 'ceiling']
      }
    }
  },

  av_receiver: {
    category: 'Audio',
    label: 'AV Receiver',
    defaults: {
      specs: {
        channels: '7.2',
        power: '100W',
        connectivity: 'HDMI'
      },
      installation: {
        height: 36,
        heightType: 'AFF',
        mounting: 'rack'
      }
    },
    specs: {
      channels: {
        type: 'select',
        label: 'Channels',
        options: ['2.0', '2.1', '5.1', '7.1', '7.2', '9.2']
      },
      power: {
        type: 'select',
        label: 'Power per Channel',
        options: ['50W', '100W', '150W', '200W']
      },
      connectivity: {
        type: 'select',
        label: 'Primary Connectivity',
        options: ['HDMI', 'Analog', 'Digital', 'Network']
      }
    },
    installation: {
      height: {
        type: 'number',
        label: 'Height',
        min: 0,
        max: 120,
        step: 1
      },
      heightType: {
        type: 'select',
        label: 'Height Reference',
        options: ['AFF', 'FFL']
      },
      mounting: {
        type: 'select',
        label: 'Mounting',
        options: ['rack', 'shelf', 'wall']
      }
    }
  },

  microphone: {
    category: 'Audio',
    label: 'Microphone',
    defaults: {
      specs: {
        type: 'condenser',
        pattern: 'cardioid',
        frequency: '50-20kHz'
      },
      installation: {
        height: 48,
        heightType: 'AFF',
        mounting: 'table'
      }
    },
    specs: {
      type: {
        type: 'select',
        label: 'Microphone Type',
        options: ['dynamic', 'condenser', 'ribbon']
      },
      pattern: {
        type: 'select',
        label: 'Pickup Pattern',
        options: ['cardioid', 'omnidirectional', 'figure-8']
      },
      frequency: {
        type: 'text',
        label: 'Frequency Response'
      }
    },
    installation: {
      height: {
        type: 'number',
        label: 'Height',
        min: 0,
        max: 120,
        step: 1
      },
      heightType: {
        type: 'select',
        label: 'Height Reference',
        options: ['AFF', 'FFL']
      },
      mounting: {
        type: 'select',
        label: 'Mounting',
        options: ['table', 'stand', 'wall', 'ceiling']
      }
    }
  }
};

export function getSymbolSchema(symbolId) {
  return symbolSchemas[symbolId];
}

export function getDefaultSpecs(symbolId) {
  const schema = getSymbolSchema(symbolId);
  return schema ? { ...schema.defaults } : null;
}