#!/bin/bash
cd /home/CHANGEME(USERNAME)/Downloads/sds/server
pm2 start npm --name "poll" -- poll