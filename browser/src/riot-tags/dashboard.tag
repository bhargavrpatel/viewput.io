<dashboard>
  <h1>Dashboard for { opts.name }</h1>
  <disk-usage disk={ opts.disk }/>
  <h3>Your files: </h3>
  <files files={ opts.files } />
</dashboard>

// Disk usage component
<disk-usage>
  <strong>Available: { Math.ceil(opts.disk.avail * Math.pow(10,-9)) }</strong><br />
  <strong>Size: { Math.ceil(opts.disk.size * Math.pow(10,-9)) }</strong><br />
</disk-usage>

// List of files
<files>
  <ul>
    <li each={ opts.files }>
      { name }
    </li>
  </ul>
</files>
