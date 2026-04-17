from playwright.sync_api import sync_playwright
import os

def capture_mobile():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use iPhone 12/13/14 size
        context = browser.new_context(viewport={'width': 375, 'height': 812})
        page = context.new_page()
        
        url = 'http://localhost:3000'
        print(f"Navigating to {url}...")
        page.goto(url)
        page.wait_for_load_state('networkidle')
        
        # Ensure the artifacts directory exists
        artifact_dir = os.path.join(os.getcwd(), '.gemini', 'antigravity', 'artifacts')
        if not os.path.exists(artifact_dir):
            os.makedirs(artifact_dir)
            
        print("Capturing Hero...")
        page.screenshot(path=os.path.join(artifact_dir, 'mobile_hero.png'))
        
        print("Scrolling to Capabilities...")
        page.evaluate("window.scrollTo(0, 1500)")
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(artifact_dir, 'mobile_capabilities.png'))
        
        print("Scrolling to Integrations...")
        page.evaluate("window.scrollTo(0, 3000)")
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(artifact_dir, 'mobile_integrations.png'))
        
        print("Capturing full page...")
        page.screenshot(path=os.path.join(artifact_dir, 'mobile_full.png'), full_page=True)
        
        browser.close()
        print("Done.")

if __name__ == "__main__":
    capture_mobile()
