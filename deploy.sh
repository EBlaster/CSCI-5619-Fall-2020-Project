#!/bin/sh

USER="li001650"
MACHINE="csel-lind40-22.cselabs.umn.edu"
DIRECTORY=".www/Project/"

#uncomment these lines if you add assets to the project
rm -rf dist/assets
cp -r assets dist/assets
rsync -avr --delete --chmod=D701,F644 dist/ "$USER"@"$MACHINE":"$DIRECTORY"