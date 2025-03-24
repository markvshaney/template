# PowerShell script to add and commit the GIT_HOOKS.md file

# Add the file to the staging area
git add GIT_HOOKS.md

# Commit the file
git commit -m "restore: Add back GIT_HOOKS.md documentation"

# Push to remote
git push

# Show the status after operations
git status 