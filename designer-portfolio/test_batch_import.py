from playwright.sync_api import sync_playwright
import time
import os

urls = [
    "https://camera-webgi.vercel.app/",
    "https://lorryjovens.netlify.app/",
    "https://gitworld.netlify.app/",
    "https://clawlink.netlify.app/",
    "https://bioneural-ai.netlify.app/",
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    context.clear_cookies()

    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)

    print("=== Step 1: Login ===")
    page.goto('http://localhost:3001/landing.html')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    # Use name selector instead of id
    page.fill('input[name="username"]', 'newtestuser123')
    page.fill('input[name="password"]', 'Test123456')
    page.click('button[type="submit"]')
    page.wait_for_timeout(3000)

    print(f"After login, URL: {page.url}")

    if 'landing' in page.url.lower() and 'dashboard' not in page.url:
        print("Login may have failed, trying registration first")
        page.goto('http://localhost:3001/landing.html#register')
        page.wait_for_timeout(1000)
        page.fill('input[name="username"]', 'newuser' + str(int(time.time()))[-4:])
        page.fill('input[name="email"]', 'newuser' + str(int(time.time()))[-4:] + '@test.com')
        page.fill('input[name="password"]', 'Test123456')
        page.click('button[type="submit"]')
        page.wait_for_timeout(3000)
        print(f"After register, URL: {page.url}")

    print("=== Step 2: Navigate to Import Page ===")
    page.goto('http://localhost:3001/import.html')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    current_url = page.url
    print(f"Current URL: {current_url}")

    if 'landing' in current_url.lower():
        print("ERROR: Redirected to landing page")
        browser.close()
        exit(1)

    textarea = page.locator('#linkTextarea')
    if textarea.count() == 0:
        print("ERROR: #linkTextarea not found")
        browser.close()
        exit(1)

    print(f"=== Step 3: Import {len(urls)} URLs ===")
    textarea.fill('\n'.join(urls))
    print(f"Entered {len(urls)} URLs")

    import_btn = page.locator('#importLinksBtn')
    import_btn.click()
    print("Import button clicked")

    max_wait = 90
    elapsed = 0
    import_done = False

    while elapsed < max_wait:
        progress_text = ""
        if page.locator('#linkProgressText').count() > 0:
            try:
                progress_text = page.locator('#linkProgressText').inner_text()
            except:
                progress_text = ""

        if "导入完成" in progress_text or "成功" in progress_text:
            import_done = True
            print(f"Import completed: {progress_text}")
            break
        if "失败" in progress_text:
            print(f"Import status: {progress_text}")

        page.wait_for_timeout(1000)
        elapsed += 1
        if elapsed % 10 == 0:
            print(f"Waiting... ({elapsed}s)")

    if not import_done:
        print(f"Import may not have completed (waited {elapsed}s)")

    page.wait_for_timeout(2000)

    print("=== Step 4: Check Works Page ===")
    page.goto('http://localhost:3001/works.html')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)

    selectors = ['.work-card', '.card', '[class*="work-card"]', '[class*="card"]']
    card_count = 0
    for sel in selectors:
        count = page.locator(sel).count()
        if count > 0:
            card_count = count
            print(f"Found {count} cards using selector: {sel}")
            break

    print(f"Work cards found: {card_count}")

    os.makedirs('D:/tmp', exist_ok=True)
    page.screenshot(path='D:/tmp/works_page.png')
    print("Screenshot saved to D:/tmp/works_page.png")

    error_msgs = [m for m in console_messages if '[error]' in m]
    if error_msgs:
        print("\n=== Console Errors ===")
        for err in error_msgs[:10]:
            print(err)

    print("\n=== Test Complete ===")
    browser.close()