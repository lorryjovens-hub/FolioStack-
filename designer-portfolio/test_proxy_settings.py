from playwright.sync_api import sync_playwright

def test_proxy_settings():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        print("1. Opening landing page...")
        page.goto('http://localhost:3001/landing.html')
        page.wait_for_load_state('networkidle')

        print("2. Login...")
        page.click('#loginNavBtn')
        page.wait_for_timeout(1000)
        page.fill('input[name="username"]', 'testuser')
        page.fill('input[name="password"]', 'test123456')
        page.click('button[type="submit"]')
        page.wait_for_timeout(3000)

        print("3. Navigate to settings...")
        page.goto('http://localhost:3001/settings.html')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)

        print("4. Testing proxy settings...")
        
        # Test 1: Disable system proxy
        page.uncheck('input[name="useSystemProxy"]')
        page.fill('input[name="proxyServer"]', 'http://localhost:8080')
        
        # Save settings
        page.click('button[type="submit"]')
        page.wait_for_timeout(1000)

        print("5. Check if proxy settings are saved...")
        proxy_settings = page.evaluate("localStorage.getItem('proxySettings')")
        print(f"Proxy settings in localStorage: {proxy_settings}")

        # Test 2: Enable system proxy again
        page.check('input[name="useSystemProxy"]')
        page.fill('input[name="proxyServer"]', '')
        page.click('button[type="submit"]')
        page.wait_for_timeout(1000)

        proxy_settings = page.evaluate("localStorage.getItem('proxySettings')")
        print(f"Updated proxy settings: {proxy_settings}")

        print("\n=== Console logs ===")
        for log in console_logs[-10:]:
            print(log)

        browser.close()

if __name__ == "__main__":
    test_proxy_settings()