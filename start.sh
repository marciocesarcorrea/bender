#!/bin/bash
PID=`ps -ef |grep hubot |grep coffee|grep -v grep | grep -v bash |awk -F ' ' '{print $2}'`

for i in $PID;do
  echo "Killing process $PID"
  kill $i
done


screen -dm bash -c 'source .env && ./bin/hubot'
