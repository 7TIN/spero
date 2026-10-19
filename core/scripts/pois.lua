-- osm2pgsql flex style for crowd-drawing POIs.
-- Writes a single `pois` table with point geometries in EPSG:4326.
-- Ways and relations are reduced to their centroid.
--
-- Usage:
--   osm2pgsql -d "$DATABASE_URL" -O flex -S pois.lua --create --slim --drop file.osm.pbf

local pois = osm2pgsql.define_table({
    name = "pois",
    ids = { type = "any", id_column = "osm_id" },
    columns = {
        { column = "category", type = "text", not_null = true },
        { column = "name", type = "text" },
        { column = "geom", type = "point", projection = 4326, not_null = true },
    },
    indexes = {
        { column = "geom", method = "gist" },
        { column = "category", method = "btree" },
    },
})

-- Map OSM tags to a single crowd category. First match wins.
local function categorize(tags)
    local amenity = tags.amenity
    local railway = tags.railway
    local shop = tags.shop
    local tourism = tags.tourism
    local office = tags.office
    local public_transport = tags.public_transport

    if amenity == "college" or amenity == "university" then
        return "college"
    end
    if amenity == "school" then
        return "school"
    end
    if amenity == "hospital" or amenity == "clinic" then
        return "hospital"
    end
    if amenity == "bus_station" or railway == "station" or public_transport == "station" then
        return "transport"
    end
    if amenity == "marketplace" or shop == "mall" or shop == "supermarket" then
        return "market"
    end
    if amenity == "place_of_worship" then
        return "worship"
    end
    if tourism == "hotel" or tourism == "guest_house" then
        return "hotel"
    end
    if office == "government" or amenity == "bank" or amenity == "townhall" then
        return "office"
    end
    if amenity == "cinema" or amenity == "theatre" then
        return "entertainment"
    end
    if amenity == "restaurant" or amenity == "cafe" or amenity == "fast_food" then
        return "food"
    end

    return nil
end

local function insert_poi(object, geom)
    local category = categorize(object.tags)
    if category == nil or geom == nil or geom:is_null() then
        return
    end

    pois:insert({
        category = category,
        name = object.tags.name,
        geom = geom,
    })
end

function osm2pgsql.process_node(object)
    insert_poi(object, object:as_point())
end

function osm2pgsql.process_way(object)
    if object.is_closed then
        insert_poi(object, object:as_polygon():centroid())
    else
        insert_poi(object, object:as_linestring():centroid())
    end
end

function osm2pgsql.process_relation(object)
    local relation_type = object.tags.type
    if relation_type ~= "multipolygon" and relation_type ~= "boundary" then
        return
    end

    local ok, geom = pcall(function()
        return object:as_multipolygon():centroid()
    end)

    if ok then
        insert_poi(object, geom)
    end
end
