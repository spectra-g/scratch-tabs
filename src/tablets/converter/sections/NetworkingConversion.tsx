import React, { useState } from 'react';
import { ConversionPanel } from '../components/ConversionPanel';
import { ConversionInput } from '../components/ConversionInput';
import punycode from 'punycode';

interface Props {
  searchQuery: string;
}

export const NetworkingConversion: React.FC<Props> = ({ searchQuery }) => {
  const [cidrInput, setCidrInput] = useState('');
  const [domainInput, setDomainInput] = useState('');

  const calculateCIDR = (input: string) => {
    try {
      const [ip, prefix] = input.split('/');
      const prefixNum = parseInt(prefix);
      
      if (!ip.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
        throw new Error('Invalid IP address format');
      }
      
      if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 32) {
        throw new Error('Invalid prefix length');
      }

      const ipParts = ip.split('.').map(Number);
      const ipBinary = ipParts.map(part => part.toString(2).padStart(8, '0')).join('');
      
      const networkBinary = ipBinary.slice(0, prefixNum).padEnd(32, '0');
      const broadcastBinary = ipBinary.slice(0, prefixNum).padEnd(32, '1');
      
      const networkAddress = networkBinary.match(/.{8}/g)!.map(bin => parseInt(bin, 2)).join('.');
      const broadcastAddress = broadcastBinary.match(/.{8}/g)!.map(bin => parseInt(bin, 2)).join('.');
      
      const numHosts = Math.pow(2, 32 - prefixNum) - 2;
      const firstHost = networkBinary === broadcastBinary ? networkAddress :
        networkBinary.slice(0, -1) + '1'.match(/.{8}/g)!.map(bin => parseInt(bin, 2)).join('.');
      const lastHost = networkBinary === broadcastBinary ? broadcastAddress :
        broadcastBinary.slice(0, -1) + '0'.match(/.{8}/g)!.map(bin => parseInt(bin, 2)).join('.');

      return {
        'Network Address': networkAddress,
        'Broadcast Address': broadcastAddress,
        'First Host': firstHost,
        'Last Host': lastHost,
        'Number of Hosts': numHosts.toString(),
        'Subnet Mask': new Array(4).fill(0).map((_, i) => {
          const pos = i * 8;
          const bits = Math.min(8, Math.max(0, prefixNum - pos));
          return bits === 0 ? 0 : 256 - Math.pow(2, 8 - bits);
        }).join('.')
      };
    } catch (e) {
      return { 'Error': e instanceof Error ? e.message : 'Invalid input' };
    }
  };

  const convertDomain = (input: string) => {
    try {
      if (!input) return {};

      const isAscii = /^[\x00-\x7F]*$/.test(input);
      if (isAscii) {
        // Convert from Punycode to Unicode
        return {
          'Unicode Domain': punycode.toUnicode(input),
          'Punycode Domain': input
        };
      } else {
        // Convert from Unicode to Punycode
        return {
          'Unicode Domain': input,
          'Punycode Domain': punycode.toASCII(input)
        };
      }
    } catch (e) {
      return { 'Error': 'Invalid domain name' };
    }
  };

  const panels = [
    {
      id: 'cidr',
      title: 'CIDR Calculator',
      description: 'Calculate network range, broadcast address, and more from CIDR notation',
      content: (
        <>
          <ConversionInput
            value={cidrInput}
            onChange={setCidrInput}
            placeholder="Enter CIDR notation (e.g., 192.168.1.0/24)"
            rows={1}
          />
          {cidrInput && (
            <div className="space-y-2">
              {Object.entries(calculateCIDR(cidrInput)).map(([label, value]) => (
                <div key={label}>
                  <div className="text-sm font-medium text-gray-400 mb-1">{label}:</div>
                  <div className="font-mono text-sm bg-gray-900/50 text-gray-200 px-3 py-2 rounded-md">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )
    },
    {
      id: 'punycode',
      title: 'Punycode Converter',
      description: 'Convert between Unicode and Punycode domain names',
      content: (
        <>
          <ConversionInput
            value={domainInput}
            onChange={setDomainInput}
            placeholder="Enter domain name (Unicode or Punycode)"
            rows={1}
          />
          {domainInput && (
            <div className="space-y-2">
              {Object.entries(convertDomain(domainInput)).map(([label, value]) => (
                <div key={label}>
                  <div className="text-sm font-medium text-gray-400 mb-1">{label}:</div>
                  <div className="font-mono text-sm bg-gray-900/50 text-gray-200 px-3 py-2 rounded-md">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )
    }
  ];

  const filteredPanels = panels.filter(panel =>
    panel.title.toLowerCase().includes(searchQuery) ||
    panel.description.toLowerCase().includes(searchQuery)
  );

  return (
    <>
      {filteredPanels.map(panel => (
        <ConversionPanel
          key={panel.id}
          title={panel.title}
          description={panel.description}
        >
          {panel.content}
        </ConversionPanel>
      ))}
    </>
  );
};