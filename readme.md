


# Installation. 

There are two options. 

## 1 ) Using native Java API for Neo4J connectivity.
In order to use the much faster Java wrapper for the Neo4J database, it is necessary to install node package 'java'. In order to sucessfully install java however, it is necessary to first install node-gyp, which requires the following steps:

* java 
	* node-gyp
		* Install Java
		* Install Python
		* Install C++ Visual Studio Express 

(we are not kidding, you have to install all three languages on your computer in order to make this run.)
(see more detailed explanation: https://github.com/nodejs/node-gyp);

If you do not wish to use the native java api to connect to Neo4J, then you can comment out the 'java' dependency in the package.json file. 



## 2) Use Neo4J rest API. 
The alternative is to connect to Neo4J using its rest api. You then need to install the 'seraph' package. 

For this you have to first install 

* seraph
	* Install Neo4J Community Edition. 

If you do not wish to use the native java api to connect to Neo4J, then you can comment out the seraph dependency in the package.json file. 

Whenever you start your server, you have to manually first start your Neo4J community edition, and start it up with the right database. 

To toggle between the two modes of operations, change the boolean of the file liquidNeo4JInterface.js, on the following line: 

	var useJavaInterface = true;


