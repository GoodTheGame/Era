import os
with open("project_dump.txt", "w", encoding="utf-8") as out:
    for root, _, files in os.walk("."):
        for file in files:
            if file.endswith((".py", ".js", ".html", ".css", ".json", ".md")): # добавь свои расширения
                path = os.path.join(root, file)
                out.write(f"\n\n=== ФАЙЛ: {path} ===\n")
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        out.write(f.read())
                except: pass