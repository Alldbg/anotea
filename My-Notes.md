> docker-compose up --build 
Not WORK


> docker-compose -f docker-compose.yml -f docker-compose.test.yml up
WORKING


+ with a mongodb vscode plugin , connect to  mongodb://172.18.0.3:27017/anotea?w=1  (get ip address by inspecting the container)

+ attach a shell to backend container then run `node src/jobs/data/dataset --drop` to init database