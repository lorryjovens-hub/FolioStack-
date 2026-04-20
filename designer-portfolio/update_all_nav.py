import os
import re

# 定义要更新的导航栏模式
old_pattern = r'<a href="ai-generate.html" class="nav-item">\s*<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>\s*AI生成\s*</a>'

new_content = '''                    <a href="ai-settings.html" class="nav-item">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2 2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        AI设置
                    </a>
                    <a href="ai-generate.html" class="nav-item">
                        <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        AI设计
                    </a>'''

# 要更新的HTML文件列表
html_files = [
    'dashboard.html',
    'export.html',
    'settings.html',
    'profile.html',
    'analytics.html',
    'import.html',
    'work-editor.html',
    'works.html'
]

# 执行更新
for file_name in html_files:
    file_path = os.path.join(os.getcwd(), file_name)
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否包含旧模式
        if re.search(old_pattern, content):
            # 替换内容
            new_content_file = re.sub(old_pattern, new_content, content)
            
            # 写入更新后的内容
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content_file)
            
            print(f"更新了文件: {file_name}")
        else:
            print(f"文件 {file_name} 不包含旧导航栏模式")
    else:
        print(f"文件 {file_name} 不存在")

print("更新完成！")