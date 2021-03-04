# Instructions to release a new version of Gens

1. Create a release branch with the release name, e.g. `release-1.1.1` and checkout the branch

    ```bash
    git checkout -b release-1.1.1
    ```

2. Update version to, e.g. 1.1.1

   - in `gens/__version__.py`
   - in `package.json`

3. Make sure `CHANGELOG.md`is up to date for the release


4. Commit changes, push to github and create a pull request

    ```bash
    git add gens/__version__.py
    git add package.json CHANGELOG.md
    git commit -m "Release notes version 1.1.1"
    git push -u origin release-1.1.1
    ```

5. On github click **create pull request**.

6. After getting the pull request approved by a reviewer merge it to master.

7. Draft a new release on GitHub, add some text - e.g. and abbreviated CHANGELOG - and release.
This adds a version tag, builds docker image.
