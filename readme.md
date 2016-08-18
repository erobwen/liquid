# Rationale

Liquid is a web-development framework that will make it possible to create high quality web-services/pages to a significantly reduced cost. The purpose of liquid is to do a few VERY important things very well, they are:

1. Integrate server and client & create a **full stack Javascript environment**, with shared code between server and client.
2. **Continous data structure synchronization** between server/client and peer clients to keep everything in synchronization.
3. Advanced change propagation using **dependency recording**. This means an efficient yet 100% reactive change propagation, allowing you to write code with pure business logic, rather than code that updates derived data.
4. Real OOP for models with polymorphism, model inheritance etc. for efficient programming and code reuse.

In addition to these main pillars of Liquid, liquid offers some additional features:

1. REACT integration, supporting recursive views.
2. Integrated security model based on custom user/object access levels.

The aim of liquid, is to create a full-stack developer experience for web-programming, that has similarities with developing desktop applications. No data-shuffling code between client and server has to be written. You get true OOP for models! It is also built with a "recursive mindset", in particular when it comes to view creation and REACT integration, making recursive view definitions possible.

This is a link to a work in progress document that tries to capture and describe the goals of liquid:

https://docs.google.com/document/d/1GRvU7RE23RzrpRRky8FIEYQon3L4_6x_4LV4AGnnkR0/pub

# Roadmap

The plan for the future is to include the following features.

1. Client side routing with url/browser navigation support.
2. Object version control.
3. Liquid server clustering. It should be possible to organize Liquid servers in cluster-trees where end users communicate with leafs, and where the cluster tree act as a multi level data-cache.


# Folder structure

* Liquid
	* LiquidNeo4JInterface   native Java wrapper for Neo4J (to be removed)
	* public 
		* js
			* liquid  -- The liquid libraries. Used on both client and server.
			* **liquid_application**  -- This is where your application files go. Used on both client and server. 
	* views -- ejs files for your express server. 
	* **liquid.js** -- main starting point for liquid.
	* controllers.js -- Controller definitions. 
	* liquidServer.js -- the part of the framework that only needs to reside on the server.  


# Simple demo videos

This video demonstrates the server/client synchronization in action:
https://www.youtube.com/watch?v=Z6fH0saKj5w

This video demonstrates the power of dependency recording and repeaters:
https://www.youtube.com/watch?v=5gOnmwo2jN4

This video demonstrates playing around with the graph in the Neo4J visual interface:
https://www.youtube.com/watch?v=liCdUjzHfqQ



# Gettings started

Currently, liquid is not packaged as a framework that can be downloaded with npm etc. It is just an experimental repository that can run a simple demo using Node.js.

1. Install Node 6.3.1
2. Install Neo4J 3.0.4
3. Clone the repository to c:\liquid or corresponding
4. Run npm install in this directory. (some warnings and errors, but it should be ok). 
5. Start Neo4J and open the interface. Change the password of user neo4j to "liquid"
6. run "node liquid.js" in the liquid directory.
7. Navigate to: http://localhost:4000/init  (this will populate the database with some data) **WARNING**: This will clean out everything in the database.
8. Navigate to: http://localhost:4000/view


# Liquid/Neo4J Connectivity

There are two options in how to connect to Neo4J. One way is easy, the other one gives higher performance. To toggle between the two modes of operations, change the boolean of the file liquidNeo4JInterface.js, on the following line:
	var useJavaInterface = true;
	
	
## 1 ) Using native Java API for Neo4J connectivity.

UPDATE 1: Because of recent developments with the Bolt driver for javascript connectivity with Neo4J(https://github.com/neo4j/neo4j-javascript-driver), the method of using native Java api to connect to Neo4J will probably be removed. This will simplify things a LOT, and clear up a lot of dependencies in the package.json.

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

WARNING: On windows there are some problems with using the Neo4J REST API when offline. Connecting the computer to a network solves the problem.

The alternative is to connect to Neo4J using its rest api. You then need to install the 'seraph' package.

For this you have to first install 

* seraph
	* Install Neo4J Community Edition. 

Whenever you start your server, you have to manually first start your Neo4J community edition, and start it up with the right database. 

_If you do not wish to use the native java api to connect to Neo4J, then you can comment out the seraph dependency in the package.json file._




# Dump
(No more limitation of SQL databases, multi table inheritance and the like!)

(No more "observers", "watches" and similar! see MobX for similar technique). Examples:
    * repeatOnChange(function() { ...general Javscript code...}) // Will reevaluate automatically on each change in read data.
    * object.callCached('methodName', param1, param2, param3)    // Will not reevaluate for same arguments if nothing the method reads hasn't changed.

    7. Data structure synchronization between client and server.
        * Saving data will use all outgoing relations as "part-of" relations, that dictate what is to be pushed to server/saved to database. Supporting cascading deletes/saves.
        * Data selection will be used to facilitate data structure subscription, to continously push out arbitrarily shaped data structures to client.
Each user has a certain access level (readwrite/read/none) for each object, defined by custom Javascript callback.

Liquid will not have a ton of features, at least not from the start. The important focus are to develop these aspects to perfection. Among things that have not been the focus is for example search-criterias and search handling.
