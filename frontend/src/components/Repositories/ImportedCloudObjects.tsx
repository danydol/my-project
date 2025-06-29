import React, { useEffect, useState } from 'react';
import { repositoryService } from '../../services/repositoryService';

const ImportedCloudObjects: React.FC = () => {
  const [objects, setObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repositoryService.getImportedCloudObjects()
      .then(setObjects)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading imported cloud objects...</div>;

  if (objects.length === 0) return <div>No imported cloud objects found.</div>;

  return (
    <div>
      <h2>Imported Cloud Objects</h2>
      <table>
        <thead>
          <tr>
            <th>Repository</th>
            <th>Type</th>
            <th>Object ID</th>
            <th>Imported At</th>
          </tr>
        </thead>
        <tbody>
          {objects.map((obj, idx) => (
            <tr key={idx}>
              <td>{obj.repositoryName}</td>
              <td>{obj.objectType}</td>
              <td>{obj.objectId}</td>
              <td>{new Date(obj.importedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ImportedCloudObjects; 