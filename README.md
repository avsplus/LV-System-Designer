# AV System Design App

An intuitive, web-based design tool for audio-visual professionals to create, manage, and share complex AV system designs with ease. Built on the Base44 platform, this application provides a real-time, collaborative canvas for designing and documenting AV projects.

## 🚀 Main Features

*   **Visual Design Canvas**: A dynamic, drag-and-drop canvas to lay out system components.
*   **Comprehensive Product Library**: Browse and use a pre-populated library of AV products, including speakers, projectors, switches, and more.
*   **Floorplan Integration**: Upload floorplan images (JPG, PNG, PDF), scale them accurately, and use them as a visual backdrop for your designs.
*   **Room Management**: Organize your project by creating rooms and assigning devices to them.
*   **Intelligent Connections**: Draw connections between devices, with smart validation for different connection types (HDMI, Ethernet, Speaker Wire, etc.).
*   **Project Management**: Create, save, load, and manage multiple AV projects.
*   **Real-Time Collaboration**: Work on designs with your team members in real-time, with presence indicators to see who is online.
*   **PDF Export**: Generate professional PDF exports of your designs for client proposals or installation guides.
*   **Activity Tracking**: Keep a log of all major changes and activities within a project.

## 🛠️ Tech Stack

*   **Frontend**: React, Tailwind CSS, TypeScript
*   **Backend & Platform**: Base44 (handles database, authentication, storage, and serverless functions)
*   **Key Libraries**:
    *   `@tanstack/react-query` for data fetching and state management.
    *   `@hello-pangea/dnd` for drag-and-drop functionality.
    *   `lucide-react` for icons.
    *   `jspdf` for PDF generation.

## 🏃‍♀️ Getting Started

This is a web application built on the Base44 low-code platform.

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the development server:**
    The project is run via the Base44 platform's development environment. Follow the standard procedure for running a Base44 application.

## 📋 How to Use the App

1.  **Open the Project Manager**: From the top menu, select `Project` > `Projects`. Here you can create a new project or load an existing one.
2.  **Upload a Floorplan**:
    *   Once a project is loaded, click the `Floorplans` button in the top menu.
    *   Name your floorplan, upload an image or PDF file.
    *   Calibrate the scale by drawing a line of a known distance (e.g., a doorway). This ensures your design is dimensionally accurate.
3.  **Add Products**:
    *   Use the **Product Library** on the left to browse for AV equipment.
    *   Drag and drop products directly onto the canvas.
    *   The app will prompt you to assign the new device to a room. You can create new rooms on the fly.
4.  **Connect Devices**:
    *   Click on the connection ports (colored dots) on the side of a product card to start drawing a connection line.
    *   Drag the line to a compatible port on another device to create a connection.
5.  **Manage and Export**:
    *   Use the top menu to save your progress, manage collaborators, or export your final design to a PDF.

-----------------------------------------------------------------------------------------------------------


    AV System Design App - Complete Feature Overview
    
1. Canvas & Visualization
Interactive Canvas: Central workspace where you design your AV system. Features zoom (0.1x - 3x), pan (click + drag or spacebar + click), and grid-based positioning
Real-time Updates: All changes sync across connected users instantly via the Base44 backend
Multi-layer Rendering: SVG connections render on top, floorplans beneath, devices in the middle for proper depth

2. Product Management
Product Library: Browse 1000s of AV products (speakers, projectors, switches, etc.) with filtering by category, brand, connections
Drag-and-Drop: Drag products onto canvas → system auto-assigns them to a room → devices appear as draggable cards
Device Cards: Show product image, brand, model, price, label, network info (IP, MAC), and connection ports
Quick Edit: Edit device labels, network details, or specs without leaving the canvas
Product Details Panel: Side panel shows full specs, manuals, connections when a product is selected

3. Connection System
Smart Port Connections: Click ports to draw connections between compatible devices
Type Validation: System validates connection types (HDMI ↔ HDMI, Ethernet ↔ Ethernet, etc.)
Automatic Routing: Connections use orthogonal (right-angle) routing to avoid overlaps
Visual Feedback: Hovering over ports highlights them; hovering connections shows details
Wire IDs: Auto-generates wire IDs (V001, A001, etc.) based on connection type
Waypoint Editing: Double-click connections to add/drag waypoints for custom routing

4. Floorplan Integration
Upload Images: Support JPG, PNG, PDF floorplans
Calibration System: Draw a line of known distance (e.g., 120 inches) to accurately scale the floorplan
Positioning & Resizing: Drag floorplans around, resize from corners, lock to prevent accidental changes
Opacity Control: Adjust transparency so devices are visible over the floorplan
Multiple Floorplans: Support multi-story buildings with separate floorplans per level
Visual Overlay: Floorplans render as a semi-transparent backdrop; devices positioned on top

5. Room Management
Create Rooms: Add rooms to each floorplan (e.g., "Living Room", "Kitchen")
Assign Devices: Drag devices to rooms in the Floorplan Manager sidebar
Room Organization: View all devices in a room at a glance; collapse/expand rooms
Rename/Delete: Edit room names or remove them entirely
Device Visibility: Hover over a device in the room list → canvas highlights it; click → centers and zooms to that device

6. Project Management
Create/Save Projects: Save your canvas state (products, connections, rooms, floorplans) as a named project
Load Projects: Retrieve saved projects from the database
Ownership & Sharing: Projects are tied to your organization; share with team members
Auto-Save: Progress is periodically auto-saved to prevent data loss
Activity Log: Tracks who created devices, added connections, shared projects, etc.

7. Real-Time Collaboration
Multi-User Sync: When a teammate makes a change, your canvas updates automatically every 5 seconds
Presence Indicators: See who else is viewing/editing the project (bottom right of header)
Conflict Avoidance: Local changes block sync for 8 seconds to prevent race conditions
Activity Timeline: See all changes made by team members

8. Export & Documentation
PDF Export: Generate professional PDFs with three options:
Installer Package: Full system design with device specs and connection details
Client Proposal: Clean layout for presenting to clients
Full Documentation: Comprehensive docs with all specs and wiring info
Wire Schedule: Auto-generates a table of all connections with wire types and specs
Bill of Materials (BOM): Lists all devices with quantities and pricing
Custom Branding: Exports include your organization's logo and colors

9. Device Network Info
IP Address Tracking: Assign IP, MAC, switch port, and port number to each device
Status Indicators: Green dot = has network config; red dot = needs configuration
Network Validation: Warns if devices that need network access lack IP addresses
Quick Edit: Edit network info directly on the device card

10. Search & Import
Manual Product Search: Search by brand/model to find products not in your library
Import from SnapAV: Backend function scrapes SnapAV to add new products to your library
Enrichment: Auto-populate product connections with real-world specs from databases

11. UI/UX Features
Keyboard Shortcuts: Spacebar for pan mode, middle-click for pan/zoom, double-middle-click to center
Responsive Zoom: Zoom in on details, zoom out to see full system
Touch Support: Pinch-to-zoom on touch devices
Toast Notifications: Feedback for saves, errors, actions
Dark Theme: OLED-friendly dark interface
Tooltips: Hover over ports to see connection type, signal type, port count

12. Organization Settings
Canvas Theme: Choose dark/light/grid background
Grid Snap: Enable snapping to grid for neat alignment
Default Zoom: Set preferred starting zoom level
Custom Colors: Brand colors applied throughout the app
Labor Rates: Configure pricing for installation and programming (used in proposals)
Wire Pricing: Set material and labor costs for different wire types
How It All Works Together:
You create a project → upload a floorplan → calibrate its scale
You drag products onto the canvas → assign to rooms → they appear as draggable cards
You click connection ports to draw wires between compatible devices → validates connections
You assign network info (IPs, MACs) to devices that need it
You save the project → it syncs with your team in real-time
You export to PDF → generates professional documentation for clients or installers
All changes are persisted to the Base44 database, synced across users, tracked for audit trails, and can be exported in multiple formats.
