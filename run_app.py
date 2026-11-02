#!/usr/bin/env python3
"""
Alexandria LMS - Universal Application Launcher
Allows launching either the Native Desktop App or Web App Server
"""

import sys
import os
import webbrowser
import subprocess
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def start_desktop():
    print("🚀 Launching Alexandria Native Desktop App...")
    import desktop_app
    desktop_app.main()

def start_web():
    print("🌐 Starting Alexandria Web Server on http://localhost:8000...")
    webbrowser.open("http://localhost:8000")
    import server
    server.run()

def main():
    if "--web" in sys.argv or "-w" in sys.argv:
        start_web()
    elif "--gui" in sys.argv or "-g" in sys.argv:
        start_desktop()
    else:
        # Check if DISPLAY or Aqua GUI is accessible
        try:
            start_desktop()
        except Exception as e:
            print(f"Could not open graphical desktop interface: {e}")
            print("Falling back to web app...")
            start_web()

if __name__ == "__main__":
    main()
