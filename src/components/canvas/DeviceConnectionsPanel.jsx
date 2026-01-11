import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Pencil } from "lucide-react";
import DeviceQuickEditForm from "./DeviceQuickEditForm";

const connectionsByCategory = {
  televisions: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }] },
      { type: "Component", ports: [{ id: "component-1", label: "Component-1", direction: "input" }] },
      { type: "Composite", ports: [{ id: "composite-1", label: "Composite-1", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-in", label: "Optical-In", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
      { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] }
    ],
    outputs: [
      { type: "Optical", ports: [{ id: "optical-out", label: "Optical-Out", direction: "output" }] },
      { type: "3.5mm Jack", ports: [{ id: "headphone", label: "Headphone", direction: "output" }] }
    ],
    description: "Video display device"
  },
  projectors: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }] },
      { type: "VGA", ports: [{ id: "vga", label: "VGA", direction: "input" }] },
      { type: "Component", ports: [{ id: "component-1", label: "Component-1", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
      { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] },
      { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
    ],
    outputs: [
      { type: "3.5mm Jack", ports: [{ id: "audio-out", label: "Audio-Out", direction: "output" }] }
    ],
    description: "Video projection device"
  },
  projector_screens: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "Control", ports: [{ id: "trigger-1", label: "Trigger-1", direction: "input" }, { id: "trigger-2", label: "Trigger-2", direction: "input" }] },
      { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
    ],
    outputs: [],
    description: "Motorized projection screen"
  },
  video_distribution: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
      { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] },
      { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }, { id: "hdmi-out-3", label: "HDMI-Out-3", direction: "output" }, { id: "hdmi-out-4", label: "HDMI-Out-4", direction: "output" }, { id: "hdmi-out-5", label: "HDMI-Out-5", direction: "output" }, { id: "hdmi-out-6", label: "HDMI-Out-6", direction: "output" }] },
      { type: "HDBaseT", ports: [{ id: "hdbaset-1", label: "HDBaseT-1", direction: "output" }, { id: "hdbaset-2", label: "HDBaseT-2", direction: "output" }, { id: "hdbaset-3", label: "HDBaseT-3", direction: "output" }, { id: "hdbaset-4", label: "HDBaseT-4", direction: "output" }] }
    ],
    description: "Video signal distribution"
  },
  matrix_switchers: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }, { id: "hdmi-5", label: "HDMI-5", direction: "input" }, { id: "hdmi-6", label: "HDMI-6", direction: "input" }, { id: "hdmi-7", label: "HDMI-7", direction: "input" }, { id: "hdmi-8", label: "HDMI-8", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
      { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }, { id: "hdmi-out-3", label: "HDMI-Out-3", direction: "output" }, { id: "hdmi-out-4", label: "HDMI-Out-4", direction: "output" }, { id: "hdmi-out-5", label: "HDMI-Out-5", direction: "output" }, { id: "hdmi-out-6", label: "HDMI-Out-6", direction: "output" }, { id: "hdmi-out-7", label: "HDMI-Out-7", direction: "output" }, { id: "hdmi-out-8", label: "HDMI-Out-8", direction: "output" }] }
    ],
    description: "Video matrix switching"
  },
  audio_streamers: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
      { type: "USB", ports: [{ id: "usb", label: "USB", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-in", label: "Optical-In", direction: "input" }] },
      { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] }
    ],
    outputs: [
      { type: "RCA", ports: [{ id: "rca-l", label: "Out-L", direction: "output" }, { id: "rca-r", label: "Out-R", direction: "output" }] },
      { type: "Optical", ports: [{ id: "optical-out", label: "Optical-Out", direction: "output" }] },
      { type: "Coaxial", ports: [{ id: "coaxial-out", label: "Coaxial-Out", direction: "output" }] },
      { type: "XLR", ports: [{ id: "xlr-l", label: "XLR-L", direction: "output" }, { id: "xlr-r", label: "XLR-R", direction: "output" }] }
    ],
    description: "Network audio streaming"
  },
  media_streamers: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
      { type: "USB", ports: [{ id: "usb", label: "USB", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out", label: "HDMI-Out", direction: "output" }] }
    ],
    description: "Media streaming device"
  },
  speakers: {
    inputs: [
      { type: "Speaker Wire", ports: [{ id: "speaker-in", label: "Input", direction: "input" }] }
    ],
    outputs: [],
    description: "Audio output device"
  },
  soundbars: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-in", label: "Optical-In", direction: "input" }] },
      { type: "RCA", ports: [{ id: "rca-l", label: "RCA-L", direction: "input" }, { id: "rca-r", label: "RCA-R", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
      { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out", label: "HDMI-Out", direction: "output" }] },
      { type: "Subwoofer", ports: [{ id: "sub-out", label: "Sub-Out", direction: "output" }] }
    ],
    description: "All-in-one speaker system"
  },
  subwoofers: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "Subwoofer", ports: [{ id: "sub-in", label: "Input", direction: "input" }] }
    ],
    outputs: [],
    description: "Low-frequency audio output"
  },
  stereo_amps: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "RCA", ports: [{ id: "rca-1", label: "RCA-1", direction: "input" }, { id: "rca-2", label: "RCA-2", direction: "input" }] },
      { type: "XLR", ports: [{ id: "xlr-l", label: "XLR-L", direction: "input" }, { id: "xlr-r", label: "XLR-R", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-1", label: "Optical-1", direction: "input" }] },
      { type: "Coaxial", ports: [{ id: "coaxial", label: "Coaxial", direction: "input" }] },
      { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] },
      { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: [{ id: "speaker-l", label: "Speaker-L", direction: "output" }, { id: "speaker-r", label: "Speaker-R", direction: "output" }] },
      { type: "RCA", ports: [{ id: "preout-l", label: "Pre-Out-L", direction: "output" }, { id: "preout-r", label: "Pre-Out-R", direction: "output" }] }
    ],
    description: "Stereo amplification"
  },
  multizone_amps: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "RCA", ports: [{ id: "zone1-l", label: "Zone-1-L", direction: "input" }, { id: "zone1-r", label: "Zone-1-R", direction: "input" }, { id: "zone2-l", label: "Zone-2-L", direction: "input" }, { id: "zone2-r", label: "Zone-2-R", direction: "input" }, { id: "zone3-l", label: "Zone-3-L", direction: "input" }, { id: "zone3-r", label: "Zone-3-R", direction: "input" }, { id: "zone4-l", label: "Zone-4-L", direction: "input" }, { id: "zone4-r", label: "Zone-4-R", direction: "input" }] },
      { type: "XLR", ports: [{ id: "xlr-1l", label: "XLR-1-L", direction: "input" }, { id: "xlr-1r", label: "XLR-1-R", direction: "input" }, { id: "xlr-2l", label: "XLR-2-L", direction: "input" }, { id: "xlr-2r", label: "XLR-2-R", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] },
      { type: "IR", ports: [{ id: "ir-in", label: "IR-In", direction: "input" }] },
      { type: "RS232", ports: [{ id: "rs232", label: "RS232", direction: "input" }] }
    ],
    outputs: [
      { type: "Speaker Wire", ports: [{ id: "zone1-l", label: "Zone-1-L", direction: "output" }, { id: "zone1-r", label: "Zone-1-R", direction: "output" }, { id: "zone2-l", label: "Zone-2-L", direction: "output" }, { id: "zone2-r", label: "Zone-2-R", direction: "output" }, { id: "zone3-l", label: "Zone-3-L", direction: "output" }, { id: "zone3-r", label: "Zone-3-R", direction: "output" }, { id: "zone4-l", label: "Zone-4-L", direction: "output" }, { id: "zone4-r", label: "Zone-4-R", direction: "output" }] }
    ],
    description: "Multi-zone power amplification"
  },
  surround_processors: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }, { id: "hdmi-5", label: "HDMI-5", direction: "input" }, { id: "hdmi-6", label: "HDMI-6", direction: "input" }, { id: "hdmi-7", label: "HDMI-7", direction: "input" }] },
      { type: "RCA", ports: [{ id: "rca-1", label: "RCA-1", direction: "input" }, { id: "rca-2", label: "RCA-2", direction: "input" }] },
      { type: "XLR", ports: [{ id: "xlr-l", label: "XLR-L", direction: "input" }, { id: "xlr-r", label: "XLR-R", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-1", label: "Optical-1", direction: "input" }, { id: "optical-2", label: "Optical-2", direction: "input" }] },
      { type: "Coaxial", ports: [{ id: "coaxial-1", label: "Coaxial-1", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }] },
      { type: "RCA", ports: [{ id: "rca-fl", label: "FL", direction: "output" }, { id: "rca-fr", label: "FR", direction: "output" }, { id: "rca-c", label: "C", direction: "output" }, { id: "rca-sl", label: "SL", direction: "output" }, { id: "rca-sr", label: "SR", direction: "output" }, { id: "rca-sbl", label: "SBL", direction: "output" }, { id: "rca-sbr", label: "SBR", direction: "output" }, { id: "rca-sub", label: "Sub", direction: "output" }] },
      { type: "XLR", ports: [{ id: "xlr-fl", label: "XLR-FL", direction: "output" }, { id: "xlr-fr", label: "XLR-FR", direction: "output" }, { id: "xlr-c", label: "XLR-C", direction: "output" }, { id: "xlr-sl", label: "XLR-SL", direction: "output" }, { id: "xlr-sr", label: "XLR-SR", direction: "output" }, { id: "xlr-sub", label: "XLR-Sub", direction: "output" }] }
    ],
    description: "Surround sound processing"
  },
  av_receivers: {
    inputs: [
      { type: "Power", ports: [{ id: "power-ac", label: "AC", direction: "input" }] },
      { type: "HDMI", ports: [{ id: "hdmi-1", label: "HDMI-1", direction: "input" }, { id: "hdmi-2", label: "HDMI-2", direction: "input" }, { id: "hdmi-3", label: "HDMI-3", direction: "input" }, { id: "hdmi-4", label: "HDMI-4", direction: "input" }, { id: "hdmi-5", label: "HDMI-5", direction: "input" }, { id: "hdmi-6", label: "HDMI-6", direction: "input" }, { id: "hdmi-7", label: "HDMI-7", direction: "input" }] },
      { type: "RCA", ports: [{ id: "rca-cd", label: "CD", direction: "input" }, { id: "rca-phono", label: "Phono", direction: "input" }, { id: "rca-aux1", label: "AUX-1", direction: "input" }, { id: "rca-aux2", label: "AUX-2", direction: "input" }] },
      { type: "Optical", ports: [{ id: "optical-1", label: "Optical-1", direction: "input" }, { id: "optical-2", label: "Optical-2", direction: "input" }] },
      { type: "Coaxial", ports: [{ id: "coaxial", label: "Coaxial", direction: "input" }] },
      { type: "USB", ports: [{ id: "usb-a", label: "USB-A", direction: "input" }, { id: "usb-b", label: "USB-B", direction: "input" }] },
      { type: "Ethernet", ports: [{ id: "eth-lan", label: "LAN", direction: "input" }] }
    ],
    outputs: [
      { type: "HDMI", ports: [{ id: "hdmi-out-1", label: "HDMI-Out-1", direction: "output" }, { id: "hdmi-out-2", label: "HDMI-Out-2", direction: "output" }] },
      { type: "Speaker Wire", ports: [{ id: "speaker-fl", label: "Front-L", direction: "output" }, { id: "speaker-fr", label: "Front-R", direction: "output" }, { id: "speaker-c", label: "Center", direction: "output" }, { id: "speaker-sl", label: "Surround-L", direction: "output" }, { id: "speaker-sr", label: "Surround-R", direction: "output" }, { id: "speaker-sbl", label: "Surround-Back-L", direction: "output" }, { id: "speaker-sbr", label: "Surround-Back-R", direction: "output" }, { id: "speaker-sub1", label: "Sub-1", direction: "output" }, { id: "speaker-sub2", label: "Sub-2", direction: "output" }] },
      { type: "RCA", ports: [{ id: "rca-zone2l", label: "Zone-2-L", direction: "output" }, { id: "rca-zone2r", label: "Zone-2-R", direction: "output" }] },
      { type: "Optical", ports: [{ id: "optical-out", label: "Optical-Out", direction: "output" }] }
    ],
    description: "Central hub for audio/video"
  }
};

const connectionTypeInfo = {
  "HDMI": { color: "bg-[#E74C3C]/10 text-[#E74C3C] border-[#E74C3C]/20", signals: "Video, Audio, Control", highlight: { bg: "bg-[#E74C3C]/20", border: "border-[#E74C3C]/40", hover: "hover:border-[#E74C3C]", text: "text-[#E74C3C]" } },
  "Optical": { color: "bg-[#2A7FDB]/10 text-[#2A7FDB] border-[#2A7FDB]/20", signals: "Digital Audio", highlight: { bg: "bg-[#2A7FDB]/20", border: "border-[#2A7FDB]/40", hover: "hover:border-[#2A7FDB]", text: "text-[#2A7FDB]" } },
  "RCA": { color: "bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/20", signals: "Analog Audio/Video", highlight: { bg: "bg-[#FFB300]/20", border: "border-[#FFB300]/40", hover: "hover:border-[#FFB300]", text: "text-[#FFB300]" } },
  "XLR": { color: "bg-[#1ABC9C]/10 text-[#1ABC9C] border-[#1ABC9C]/20", signals: "Balanced Audio", highlight: { bg: "bg-[#1ABC9C]/20", border: "border-[#1ABC9C]/40", hover: "hover:border-[#1ABC9C]", text: "text-[#1ABC9C]" } },
  "Speaker Wire": { color: "bg-[#8E5C2C]/10 text-[#8E5C2C] border-[#8E5C2C]/20", signals: "Speaker Audio", highlight: { bg: "bg-[#8E5C2C]/20", border: "border-[#8E5C2C]/40", hover: "hover:border-[#8E5C2C]", text: "text-[#8E5C2C]" } },
  "Ethernet": { color: "bg-[#27AE60]/10 text-[#27AE60] border-[#27AE60]/20", signals: "Network Data", highlight: { bg: "bg-[#27AE60]/20", border: "border-[#27AE60]/40", hover: "hover:border-[#27AE60]", text: "text-[#27AE60]" } },
  "SFP": { color: "bg-[#00CED1]/10 text-[#00CED1] border-[#00CED1]/20", signals: "Fiber Network", highlight: { bg: "bg-[#00CED1]/20", border: "border-[#00CED1]/40", hover: "hover:border-[#00CED1]", text: "text-[#00CED1]" } },
  "USB": { color: "bg-[#2A7FDB]/10 text-[#2A7FDB] border-[#2A7FDB]/20", signals: "Digital Data/Audio", highlight: { bg: "bg-[#2A7FDB]/20", border: "border-[#2A7FDB]/40", hover: "hover:border-[#2A7FDB]", text: "text-[#2A7FDB]" } },
  "Coaxial": { color: "bg-[#2A7FDB]/10 text-[#2A7FDB] border-[#2A7FDB]/20", signals: "Digital Audio", highlight: { bg: "bg-[#2A7FDB]/20", border: "border-[#2A7FDB]/40", hover: "hover:border-[#2A7FDB]", text: "text-[#2A7FDB]" } },
  "3.5mm Jack": { color: "bg-[#F4D03F]/10 text-[#F4D03F] border-[#F4D03F]/20", signals: "Analog Audio", highlight: { bg: "bg-[#F4D03F]/20", border: "border-[#F4D03F]/40", hover: "hover:border-[#F4D03F]", text: "text-[#F4D03F]" } },
  "Component": { color: "bg-[#E74C3C]/10 text-[#E74C3C] border-[#E74C3C]/20", signals: "Analog Video", highlight: { bg: "bg-[#E74C3C]/20", border: "border-[#E74C3C]/40", hover: "hover:border-[#E74C3C]", text: "text-[#E74C3C]" } },
  "Composite": { color: "bg-[#E74C3C]/10 text-[#E74C3C] border-[#E74C3C]/20", signals: "Analog Video", highlight: { bg: "bg-[#E74C3C]/20", border: "border-[#E74C3C]/40", hover: "hover:border-[#E74C3C]", text: "text-[#E74C3C]" } },
  "VGA": { color: "bg-[#E74C3C]/10 text-[#E74C3C] border-[#E74C3C]/20", signals: "Analog Video", highlight: { bg: "bg-[#E74C3C]/20", border: "border-[#E74C3C]/40", hover: "hover:border-[#E74C3C]", text: "text-[#E74C3C]" } },
  "RS232": { color: "bg-[#7F8C8D]/10 text-[#7F8C8D] border-[#7F8C8D]/20", signals: "Serial Control", highlight: { bg: "bg-[#7F8C8D]/20", border: "border-[#7F8C8D]/40", hover: "hover:border-[#7F8C8D]", text: "text-[#7F8C8D]" } },
  "HDBaseT": { color: "bg-[#E91E63]/10 text-[#E91E63] border-[#E91E63]/20", signals: "Video over Network", highlight: { bg: "bg-[#E91E63]/20", border: "border-[#E91E63]/40", hover: "hover:border-[#E91E63]", text: "text-[#E91E63]" } },
  "Control": { color: "bg-[#7F8C8D]/10 text-[#7F8C8D] border-[#7F8C8D]/20", signals: "Device Control", highlight: { bg: "bg-[#7F8C8D]/20", border: "border-[#7F8C8D]/40", hover: "hover:border-[#7F8C8D]", text: "text-[#7F8C8D]" } },
  "Subwoofer": { color: "bg-[#8E5C2C]/10 text-[#8E5C2C] border-[#8E5C2C]/20", signals: "Low Frequency Audio", highlight: { bg: "bg-[#8E5C2C]/20", border: "border-[#8E5C2C]/40", hover: "hover:border-[#8E5C2C]", text: "text-[#8E5C2C]" } },
  "IR": { color: "bg-[#7F8C8D]/10 text-[#7F8C8D] border-[#7F8C8D]/20", signals: "Infrared Control", highlight: { bg: "bg-[#7F8C8D]/20", border: "border-[#7F8C8D]/40", hover: "hover:border-[#7F8C8D]", text: "text-[#7F8C8D]" } },
  "Wireless": { color: "bg-[#27AE60]/10 text-[#27AE60] border-[#27AE60]/20", signals: "Wireless Network", highlight: { bg: "bg-[#27AE60]/20", border: "border-[#27AE60]/40", hover: "hover:border-[#27AE60]", text: "text-[#27AE60]" } },
  "Power": { color: "bg-[#FFA500]/10 text-[#FFA500] border-[#FFA500]/20", signals: "AC Power", highlight: { bg: "bg-[#FFA500]/20", border: "border-[#FFA500]/40", hover: "hover:border-[#FFA500]", text: "text-[#FFA500]" } },
  "Various": { color: "bg-gray-500/10 text-gray-400 border-gray-500/20", signals: "Multiple Types", highlight: { bg: "bg-gray-500/20", border: "border-gray-500/40", hover: "hover:border-gray-500", text: "text-gray-300" } }
};

export default function DeviceConnectionsPanel({ product, label, networkInfo = { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' }, activeConnections, allProducts, onClose, onHighlightConnections, onNetworkInfoChange, onDeviceUpdate }) {
  const [localNetworkInfo, setLocalNetworkInfo] = useState(networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' });
  const [showQuickEdit, setShowQuickEdit] = useState(false);

  React.useEffect(() => {
    setLocalNetworkInfo(networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' });
  }, [product.instanceId, networkInfo]);
  
  const instanceId = product.instanceId;
  const productData = product.product || product;
  
  // Use database connections if available, otherwise use category defaults
  const defaultConnections = connectionsByCategory[productData.category] || { inputs: [], outputs: [], description: "" };
  const hasDbConnections = (productData.input_connections && productData.input_connections.length > 0) || 
                            (productData.output_connections && productData.output_connections.length > 0);

  let connections = hasDbConnections ? {
    inputs: productData.input_connections || [],
    outputs: productData.output_connections || [],
    description: defaultConnections.description
  } : defaultConnections;
  
  // Get connections for this device instance
  const deviceConnections = activeConnections.filter(
    conn => conn.from === instanceId || conn.to === instanceId
  );
  
  // Normalize database connections to match expected format
  const normalizedConnections = connections;
  if (hasDbConnections) {
    // Ensure ports are in correct format for database connections
    normalizedConnections.inputs = (productData.input_connections || []).map(conn => ({
      type: conn.type,
      ports: (conn.ports || []).map(p => typeof p === 'string' ? { id: p, label: p, direction: 'input' } : p)
    }));
    normalizedConnections.outputs = (productData.output_connections || []).map(conn => ({
      type: conn.type,
      ports: (conn.ports || []).map(p => typeof p === 'string' ? { id: p, label: p, direction: 'output' } : p)
    }));
  }
  
  // Get used ports for a connection type
  const getUsedPorts = (connectionType, ports, isInput) => {
    const used = new Set();
    deviceConnections.forEach(conn => {
      const isCorrectDirection = isInput ? (conn.to === instanceId) : (conn.from === instanceId);
      if (!isCorrectDirection || conn.type !== connectionType) return;

      const connPort = isInput ? conn.toPort : conn.fromPort;
      if (!connPort) return;
      
      // Find matching port - exact match or fuzzy match (e.g., "Front-L" matches "Speaker-Front-Left")
      const matchingPort = ports.find(p => {
        const portLabel = typeof p === 'string' ? p : p.label;
        const pNorm = portLabel.toLowerCase().replace(/[-_]/g, '');
        const cNorm = connPort.toLowerCase().replace(/[-_]/g, '');
        return portLabel === connPort || pNorm.includes(cNorm) || cNorm.includes(pNorm);
      });
      
      if (matchingPort) used.add(typeof matchingPort === 'string' ? matchingPort : matchingPort.label);
    });
    return used;
  };
  
  // Get connected device info for a specific port
  const getConnectedDevice = (connectionType, port, isInput) => {
    const conn = deviceConnections.find(c => {
      const isCorrectDirection = isInput ? (c.to === instanceId) : (c.from === instanceId);
      if (!isCorrectDirection || c.type !== connectionType) return false;

      const checkPort = isInput ? c.toPort : c.fromPort;
      if (!checkPort) return false;
      
      // Fuzzy match for port names
      const pNorm = port.toLowerCase().replace(/[-_]/g, '');
      const cNorm = checkPort.toLowerCase().replace(/[-_]/g, '');
      return checkPort === port || pNorm.includes(cNorm) || cNorm.includes(pNorm);
    });

    if (!conn) return null;

    const connectedId = conn.from === instanceId ? conn.to : conn.from;
    const connectedDevice = allProducts.find(p => p.instanceId === connectedId);
    const connectedPort = conn.from === instanceId ? conn.toPort : conn.fromPort;

    return { device: connectedDevice, port: connectedPort, conn };
  };

  // Get connection index for highlighting
  const getConnectionIndex = (connectionType, port, isInput) => {
    return activeConnections.findIndex(conn => {
      const isCorrectDirection = isInput ? (conn.to === instanceId) : (conn.from === instanceId);
      if (!isCorrectDirection || conn.type !== connectionType) return false;
      
      const checkPort = isInput ? conn.toPort : conn.fromPort;
      return checkPort === port;
    });
  };
  
  // Get all connections for a connection type
  const getTypeConnections = (connectionType, isInput) => {
    return deviceConnections.filter(conn => {
      const isCorrectDirection = isInput ? (conn.to === instanceId) : (conn.from === instanceId);
      return isCorrectDirection && conn.type === connectionType;
    });
  };

  return (
    <div className="fixed right-0 top-[87px] bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-40 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Device Connections</h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-gradient-to-r from-gray-800 to-gray-750 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Device Label</span>
          </div>
          <div className="text-3xl font-mono font-bold text-white">
            {label || 'N/A'}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3 flex-1 min-w-0">
              <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700 border border-gray-600 flex items-center justify-center">
                {productData.image_url && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(productData.image_url) ? (
                  <img 
                    src={productData.image_url} 
                    alt={`${productData.brand} ${productData.model}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { 
                      e.target.style.display = 'none'; 
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center text-gray-500 ${productData.image_url && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(productData.image_url) ? 'hidden' : ''}`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-1">{productData.brand}</h3>
                <p className="text-sm text-gray-300 mb-2">{productData.model}</p>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${
                    {
                      televisions: "bg-blue-600",
                      projectors: "bg-purple-600",
                      projector_screens: "bg-fuchsia-600",
                      video_distribution: "bg-cyan-500",
                      matrix_switchers: "bg-teal-600",
                      audio_streamers: "bg-pink-500",
                      media_streamers: "bg-rose-600",
                      speakers: "bg-green-600",
                      soundbars: "bg-lime-500",
                      subwoofers: "bg-red-600",
                      stereo_amps: "bg-orange-600",
                      multizone_amps: "bg-amber-600",
                      surround_processors: "bg-yellow-400",
                      av_receivers: "bg-emerald-600",
                      access_points: "bg-sky-500",
                      patch_panels: "bg-slate-500",
                      data_jacks: "bg-blue-500",
                      telephones: "bg-cyan-600",
                      phone_jacks: "bg-cyan-500",
                      intercoms: "bg-teal-500",
                      nvrs: "bg-gray-600",
                      ip_cameras: "bg-gray-500"
                    }[productData.category]
                  }`}></div>
                  <span className="text-xs text-gray-400 capitalize">{productData.category.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
            {onDeviceUpdate && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowQuickEdit(true)}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700 flex-shrink-0"
                title="Quick Edit Device"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-400 mb-2">{connections.description}</p>
        </div>

        {(connections.inputs.some(input => input.type === "Ethernet") || connections.outputs.some(output => output.type === "Ethernet")) && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-3">Network Information</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">SW#</label>
                <Input
                  value={localNetworkInfo.sw}
                  onChange={(e) => setLocalNetworkInfo({ ...localNetworkInfo, sw: e.target.value })}
                  onBlur={() => onNetworkInfoChange && onNetworkInfoChange(localNetworkInfo)}
                  placeholder={networkInfo?.sw || "00"}
                  className="bg-gray-900 border-gray-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Port</label>
                <Input
                  value={localNetworkInfo.port}
                  onChange={(e) => setLocalNetworkInfo({ ...localNetworkInfo, port: e.target.value })}
                  onBlur={() => onNetworkInfoChange && onNetworkInfoChange(localNetworkInfo)}
                  placeholder={networkInfo?.port || "00"}
                  className="bg-gray-900 border-gray-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">IP Address</label>
                <Input
                  value={localNetworkInfo.ip}
                  onChange={(e) => setLocalNetworkInfo({ ...localNetworkInfo, ip: e.target.value })}
                  onBlur={() => onNetworkInfoChange && onNetworkInfoChange(localNetworkInfo)}
                  placeholder={networkInfo?.ip || "000.000.000.000"}
                  className="bg-gray-900 border-gray-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">MAC Address</label>
                <Input
                  value={localNetworkInfo.mac}
                  onChange={(e) => setLocalNetworkInfo({ ...localNetworkInfo, mac: e.target.value })}
                  onBlur={() => onNetworkInfoChange && onNetworkInfoChange(localNetworkInfo)}
                  placeholder={networkInfo?.mac || "00:00:00:00:00:00"}
                  className="bg-gray-900 border-gray-700 text-white text-sm"
                />
              </div>
            </div>
          </div>
        )}



        {connections.inputs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Input Connections
            </h4>
            <div className="space-y-3">
              {connections.inputs.map((input, idx) => {
                const info = connectionTypeInfo[input.type] || connectionTypeInfo["Various"];
                const usedPorts = getUsedPorts(input.type, input.ports, true);
                const highlightColor = info.highlight;

                return (
                  <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`${info.color} border text-sm`}>
                        {input.type}
                      </Badge>
                      <span className={`text-xs font-medium ${usedPorts.size < input.ports.length ? 'text-green-400' : 'text-red-400'}`}>
                        {usedPorts.size}/{input.ports.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{info.signals}</p>
                    <div className="space-y-1 mt-2">
                      {(input.ports || []).map((port) => {
                        const portLabel = typeof port === 'string' ? port : (port?.label || '');
                        const isUsed = usedPorts.has(portLabel);
                        const connectedInfo = isUsed ? getConnectedDevice(input.type, portLabel, true) : null;
                        const connectionIdx = connectedInfo?.conn ? activeConnections.indexOf(connectedInfo.conn) : -1;

                        return (
                          <div 
                            key={portLabel}
                            className={`flex items-center justify-between p-2 rounded text-xs transition-all ${
                              isUsed 
                                ? `${highlightColor.bg} border ${highlightColor.border} ${highlightColor.hover} cursor-pointer` 
                                : 'bg-gray-900/50'
                            }`}
                            onMouseEnter={() => isUsed && connectionIdx !== -1 && onHighlightConnections && onHighlightConnections([connectionIdx])}
                            onMouseLeave={() => onHighlightConnections && onHighlightConnections([])}
                          >
                            <span className={isUsed ? `${highlightColor.text} font-medium` : 'text-gray-500'}>{portLabel}</span>
                            {isUsed && connectedInfo?.device && (
                              <span className="text-gray-400 text-[10px] truncate ml-2">
                                ← {connectedInfo.device.label || connectedInfo.device.brand} ({connectedInfo.port})
                              </span>
                            )}
                            {!isUsed && <span className="text-gray-600 text-[10px]">Available</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {connections.outputs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
              Output Connections
            </h4>
            

            
            <div className="space-y-3">
              {connections.outputs.map((output, idx) => {
                const info = connectionTypeInfo[output.type] || connectionTypeInfo["Various"];
                const usedPorts = getUsedPorts(output.type, output.ports, false);
                const highlightColor = info.highlight;

                return (
                  <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`${info.color} border text-sm`}>
                        {output.type}
                      </Badge>
                      <span className={`text-xs font-medium ${usedPorts.size < output.ports.length ? 'text-green-400' : 'text-red-400'}`}>
                        {usedPorts.size}/{output.ports.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{info.signals}</p>
                    <div className="space-y-1 mt-2">
                      {(output.ports || []).map((port) => {
                        const portLabel = typeof port === 'string' ? port : (port?.label || '');
                        const isUsed = usedPorts.has(portLabel);
                        const connectedInfo = isUsed ? getConnectedDevice(output.type, portLabel, false) : null;
                        const connectionIdx = connectedInfo?.conn ? activeConnections.indexOf(connectedInfo.conn) : -1;

                        return (
                          <div 
                            key={portLabel}
                            className={`flex items-center justify-between p-2 rounded text-xs transition-all ${
                              isUsed 
                                ? `${highlightColor.bg} border ${highlightColor.border} ${highlightColor.hover} cursor-pointer` 
                                : 'bg-gray-900/50'
                            }`}
                            onMouseEnter={() => isUsed && connectionIdx !== -1 && onHighlightConnections && onHighlightConnections([connectionIdx])}
                            onMouseLeave={() => onHighlightConnections && onHighlightConnections([])}
                          >
                            <span className={isUsed ? `${highlightColor.text} font-medium` : 'text-gray-500'}>{portLabel}</span>
                            {isUsed && connectedInfo?.device && (
                              <span className="text-gray-400 text-[10px] truncate ml-2">
                                → {connectedInfo.device.label || connectedInfo.device.brand} ({connectedInfo.port})
                              </span>
                            )}
                            {!isUsed && <span className="text-gray-600 text-[10px]">Available</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {productData.control && (productData.control.ip || productData.control.rs232 || productData.control.ir || productData.control.trigger || (productData.control.protocols && productData.control.protocols.length > 0)) && (
          <div className="border-t border-gray-800 pt-4">
            <h4 className="text-sm font-semibold text-white mb-3">Control Capabilities</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {productData.control.ip && (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                  IP Control
                </Badge>
              )}
              {productData.control.rs232 && (
                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                  RS232
                </Badge>
              )}
              {productData.control.ir && (
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                  IR
                </Badge>
              )}
              {productData.control.trigger && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                  12V Trigger
                </Badge>
              )}
            </div>
            {productData.control.protocols && productData.control.protocols.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Protocols:</p>
                <div className="flex flex-wrap gap-1">
                  {productData.control.protocols.map((protocol, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {protocol}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {productData.specs && Object.keys(productData.specs).length > 0 && (
          <div className="border-t border-gray-800 pt-4">
            <h4 className="text-sm font-semibold text-white mb-3">Technical Specifications</h4>
            <div className="space-y-2">
              {Object.entries(productData.specs).map(([key, value]) => 
                value ? (
                  <div key={key} className="flex justify-between items-start py-2 border-b border-gray-800">
                    <span className="text-xs text-gray-400 capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-200 text-right ml-2">
                      {value}
                    </span>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
        </div>

        {showQuickEdit && onDeviceUpdate && (
          <DeviceQuickEditForm
            product={productData}
            onSave={(updatedProduct) => {
              onDeviceUpdate(updatedProduct);
              setShowQuickEdit(false);
            }}
            onClose={() => setShowQuickEdit(false)}
          />
        )}
        </div>
        );
        }