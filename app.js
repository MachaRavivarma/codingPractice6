const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

app.use(express.json());
const path = require("path");
const dbPath = path.join(__dirname, "covid19India.db");
let db = null;
const AnitilizeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB.error ${error.message}`);

    process.exit(1);
  }
};

AnitilizeDbAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const covidDetailsOfAllStates = `
    SELECT
    *
    FROM
    state
    ORDER BY
    state_id;`;
  const covidArray = await db.all(covidDetailsOfAllStates);
  response.send(
    covidArray.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getSpecificState = `
    SELECT
    *
    FROM
    state
    WHERE
    state_id = ${stateId};`;
  const state = await db.get(getSpecificState);
  response.send(convertDbObjectToResponseObject(state));
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictDetails = `
      INSERT INTO
      district( district_name, state_id, cases, cured, active, deaths )
      VALUES
      (
          '${districtName}',
          ${stateId},
          ${cases},
          ${cured},
          ${active},
          ${deaths}
      );`;
  const districtDe = await db.run(addDistrictDetails);
  const districtId = districtDe.lastID;
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const specificDistrict = `
    SELECT
    *
    FROM
    district
    WHERE district_id = ${districtId};`;
  const district = await db.get(specificDistrict);
  response.send(convertDbObjectToResponseObject(district));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `
    DELETE FROM 
    district 
    WHERE district_id = ${districtId}`;
  await db.run(deleteDistrict);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictDetails = `
      UPDATE 
        district
      SET
          district_name = '${districtName}',
          state_id = ${stateId},
          cases = ${cases},
          cured = ${cured},
          active = ${active},
          deaths = ${deaths}
      WHERE district_id = ${districtId};`;
  await db.run(updateDistrictDetails);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatesStat = `
    SELECT
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM
    district
    WHERE
    state_id = ${stateId};`;
  const stats = await db.get(getStatesStat);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `
     select state_id from district
     where district_id = ${districtId};
     `;

  //With this we will get the state_id using district table

  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery);

  const getStateNameQuery = `select state_name as stateName from state
    where state_id = ${getDistrictIdQueryResponse.state_id};`;

  //With this we will get state_name as stateName using the state_id

  const getStateNameQueryResponse = await db.get(getStateNameQuery);

  response.send(getStateNameQueryResponse);

  //sending the required response
});

module.exports = app;
