# Basic demo

This video demonstrates the server/client synchronization in action:
https://www.youtube.com/watch?v=Z6fH0saKj5w

This video demonstrates the power of dependency recording and repeaters:
https://www.youtube.com/watch?v=5gOnmwo2jN4

This video demonstrates playing around with the graph in the Neo4J visual interface:
https://www.youtube.com/watch?v=liCdUjzHfqQ



# Gettings started with the basic demo.

1. Install Node 6.3.1
2. Install Neo4J 3.0.4
3. Clone the repository to c:\liquid or corresponding
4. Run npm install in this directory. (some warnings and errors, but it should be ok). 
5. Start Neo4J and open the interface. Change the password of user neo4j to "liquid"
6. run "node liquid.js" in the liquid directory.
7. Navigate to: http://localhost:3000/init  (this will populate the database with some data)
8. Navigate to: http://localhost:3000/view

# Rationale

This is a link to a work in progress document that tries to capture and describe the goals of liquid: 

https://docs.google.com/document/d/1GRvU7RE23RzrpRRky8FIEYQon3L4_6x_4LV4AGnnkR0/pub

The main point is that liquid attempts to do a few important things very well, they are:

1. Integrate server and client.
2. Create an all Javascript programming environment from backend to frontend (with React, we even replace things such as CSS)
3. Real-time synchronization of data between server/client and peer clients. 
4. Change propagation using dependency recording. 

Liquid will not have a ton of features, at least not from the start. The important focus are to develop these aspects to perfection. Among things that have not been the focus is for example searchcriterias and search handling.


# Two ways of setting up. 

UPDATE: Because of recent developments with the Bolt driver for javascript connectivity with Neo4J(https://github.com/neo4j/neo4j-javascript-driver), the method of using native Java api to connect to Neo4J will probably be removed. This will simplify things a LOT, and clear up a lot of dependencies in the package.json.

There are two options in how to connect to Neo4J. One way is easy, the other one gives higher performance. To toggle between the two modes of operations, change the boolean of the file liquidNeo4JInterface.js, on the following line: 
	var useJavaInterface = true;
	
	
## 1 ) Using native Java API for Neo4J connectivity.
In order to use the much faster Java wrapper for the Neo4J database, it is necessary to install node package 'java'. In order to sucessfully install java however, it is necessary to first install node-gyp, which requires the following steps:

* java 
	* node-gyp
		* Install Java
		* Install Python
		* Install C++ Visual Studio Express 

(see more detailed explanation: https://github.com/nodejs/node-gyp)

We are not kidding, you have to install all three languages on your computer in order to perform this installation. In the future, there will be a native javascript connection to Neo4J, that might simplify this. 

_If you do not wish to use the native java api to connect to Neo4J, then you can comment out the 'java' dependency in the package.json file._



## 2) Use Neo4J rest API. 
The alternative is to connect to Neo4J using its rest api. You then need to install the 'seraph' package. 

For this you have to first install 

* seraph
	* Install Neo4J Community Edition. 

Whenever you start your server, you have to manually first start your Neo4J community edition, and start it up with the right database. 

_If you do not wish to use the native java api to connect to Neo4J, then you can comment out the seraph dependency in the package.json file._




