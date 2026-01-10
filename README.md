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
