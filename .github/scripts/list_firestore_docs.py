import json, sys
coll = sys.argv[1]
d = json.load(open('/tmp/out.json'))
if 'documents' in d:
    print('Found ' + str(len(d['documents'])) + ' ' + coll)
    for doc in d['documents'][:15]:
        fields = doc.get('fields', {})
        doc_id = doc['name'].split('/')[-1]
        keys = ['title', 'name', 'display_name', 'label']
        name = '?'
        for k in keys:
            v = fields.get(k, {}).get('stringValue')
            if v:
                name = v
                break
        status = fields.get('status', {}).get('stringValue', '')
        city = fields.get('city', {}).get('stringValue', '')
        state = fields.get('state', {}).get('stringValue', '')
        owner_id = fields.get('owner_id', {}).get('stringValue', '')
        print('  ' + doc_id + ' | ' + name + ' | ' + status + ' | ' + city + ' | ' + state + ' | ' + owner_id)
else:
    print('ERROR:', d)
