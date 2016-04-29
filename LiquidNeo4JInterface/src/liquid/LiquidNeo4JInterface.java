package liquid;
import java.io.File;
import java.io.OutputStreamWriter;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Vector;

import org.neo4j.cypher.ExecutionEngine;
import org.neo4j.cypher.ExecutionResult;
import org.neo4j.graphdb.*;
import org.neo4j.graphdb.factory.*;
import org.neo4j.logging.FormattedLogProvider;
import org.neo4j.logging.LogProvider;
import org.neo4j.logging.NullLogProvider;
import org.neo4j.logging.async.AsyncLogProvider;

//import scala.collection.convert.*;

import scala.Array;

public class LiquidNeo4JInterface {
    static {
	    LiquidNeo4JInterface.db = null;
	   	LiquidNeo4JInterface.cypherEngine = null;
	    LiquidNeo4JInterface.ensureInitialized();
    }

	public static GraphDatabaseService db;
	public static ExecutionEngine cypherEngine;
	
	public static void ensureInitialized() {
		if (LiquidNeo4JInterface.db == null) {
			System.out.println(" === Initializing database connection ===");
			GraphDatabaseFactory dbFactory = new GraphDatabaseFactory();
			File storeDir = new File("C:\\liquid\\neo4j_db\\default.graphdb");
			LiquidNeo4JInterface.db= dbFactory.newEmbeddedDatabase(storeDir);
			LogProvider logProvider = FormattedLogProvider.toWriter(new OutputStreamWriter(System.out));
		   	LiquidNeo4JInterface.cypherEngine = new ExecutionEngine(LiquidNeo4JInterface.db, logProvider);
		}
	}
	
	public static void main(String[] args) {
		int nodeId = LiquidNeo4JInterface.createNode("Test", "Test");
		LiquidNeo4JInterface.executeQuery("MATCH (n) WHERE id(n) = " + nodeId + " SET n.foobarkazong = 'fum'");
		System.out.println(LiquidNeo4JInterface.getNode(nodeId).toString());

		//System.out.println(LiquidNeo4JInterface.getNode(80).toString());
		//System.out.println(LiquidNeo4JInterface.getRelation(80, "Releases", false).toString());
	}
	
	public static Vector executeQuery(String query) {
		LiquidNeo4JInterface.ensureInitialized();
		Vector result = new Vector();
		try (Transaction tx = db.beginTx()){
			//System.out.println(LiquidNeo4JInterface.cypherEngine.execute(query).dumpToString());
			ExecutionResult queryResult = LiquidNeo4JInterface.cypherEngine.execute(query);
			System.out.println(queryResult.dumpToString());
			Iterator iterator = queryResult.javaIterator();
			while(iterator.hasNext()) {
				result.add(iterator.next());
			}
			tx.success();
		}
		return result;
	}
	
	public static Map getProperties(Node node) {
		Map result = new HashMap();
		//node.getRelationships();
		for (String property : node.getPropertyKeys()) {
			result.put(property, node.getProperty(property));			
		}
		result.put("id", node.getId());
		return result;
	}
	
	public static int createNode(String tagName, String className) {
		LiquidNeo4JInterface.ensureInitialized();
		int nodeId; 
		try ( Transaction tx = LiquidNeo4JInterface.db.beginTx() )
		{
			Node node = LiquidNeo4JInterface.db.createNode();
			node.addLabel(DynamicLabel.label(tagName));
			node.setProperty("className", className);
			nodeId = (int)node.getId(); //Note: does not support long ids!!!!
		    tx.success();
		}		
		return nodeId;
	}
	
	public static Map getNode(int id) {
		LiquidNeo4JInterface.ensureInitialized();
		
		Map result = null;
		try ( Transaction tx = LiquidNeo4JInterface.db.beginTx() )
		{
			Node node = LiquidNeo4JInterface.db.getNodeById(id);
			result = LiquidNeo4JInterface.getProperties(node);
		    tx.success();
		}		
		return result;
	}
	
	public static Vector getRelation(int id, String relationName, boolean reverse) {
		LiquidNeo4JInterface.ensureInitialized();
		Direction direction = !reverse ? Direction.OUTGOING : Direction.INCOMING;

		RelationshipType relationshipType = DynamicRelationshipType.withName(relationName);
		Vector result = new Vector();
		try ( Transaction tx = LiquidNeo4JInterface.db.beginTx() )
		{
			Node node = LiquidNeo4JInterface.db.getNodeById(id);
			for (Relationship relationship : node.getRelationships(relationshipType, direction)) {
				if (!reverse) {
					result.add(LiquidNeo4JInterface.getProperties(relationship.getEndNode()));					
				} else {
					result.add(LiquidNeo4JInterface.getProperties(relationship.getStartNode()));										
				}
			}
		    tx.success();
		}		
		return result;
	}
	
}
