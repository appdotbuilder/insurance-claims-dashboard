import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import type { 
  ClaimWithPolicyHolder, 
  PolicyHolder, 
  CreateInsuranceClaimInput,
  CreatePolicyHolderInput,
  UpdateInsuranceClaimInput
} from '../../server/src/schema';

// Status badge colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    case 'APPROVED': return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'REJECTED': return 'bg-red-100 text-red-800 hover:bg-red-200';
    case 'INVESTIGATING': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    case 'SETTLED': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
};

// Claim type colors
const getClaimTypeColor = (type: string) => {
  switch (type) {
    case 'AUTO': return 'bg-blue-50 text-blue-700';
    case 'HOME': return 'bg-green-50 text-green-700';
    case 'LIFE': return 'bg-purple-50 text-purple-700';
    case 'HEALTH': return 'bg-red-50 text-red-700';
    case 'PROPERTY': return 'bg-orange-50 text-orange-700';
    case 'LIABILITY': return 'bg-gray-50 text-gray-700';
    default: return 'bg-gray-50 text-gray-700';
  }
};

function App() {
  const [claims, setClaims] = useState<ClaimWithPolicyHolder[]>([]);
  const [policyHolders, setPolicyHolders] = useState<PolicyHolder[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithPolicyHolder | null>(null);
  const [selectedPolicyHolder, setPolicyHolder] = useState<PolicyHolder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('claims');
  
  // Form states
  const [newClaimData, setNewClaimData] = useState<CreateInsuranceClaimInput>({
    claim_id: '',
    policy_holder_id: 0,
    date_filed: new Date(),
    claim_type: 'AUTO',
    status: 'PENDING',
    amount: 0,
    description: null
  });

  const [newPolicyHolderData, setNewPolicyHolderData] = useState<CreatePolicyHolderInput>({
    name: '',
    policy_number: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: new Date()
  });

  const [statusUpdate, setStatusUpdate] = useState<UpdateInsuranceClaimInput>({
    id: 0,
    status: 'PENDING'
  });

  // Load data
  const loadClaims = useCallback(async () => {
    try {
      const result = await trpc.getInsuranceClaims.query();
      setClaims(result);
    } catch (error) {
      console.error('Failed to load claims:', error);
    }
  }, []);

  const loadPolicyHolders = useCallback(async () => {
    try {
      const result = await trpc.getPolicyHolders.query();
      setPolicyHolders(result);
    } catch (error) {
      console.error('Failed to load policy holders:', error);
    }
  }, []);

  useEffect(() => {
    loadClaims();
    loadPolicyHolders();
  }, [loadClaims, loadPolicyHolders]);

  // Handle creating new claim
  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createInsuranceClaim.mutate(newClaimData);
      // Add policy holder info to the new claim for display
      const policyHolder = policyHolders.find((ph: PolicyHolder) => ph.id === newClaimData.policy_holder_id);
      if (policyHolder) {
        const newClaimWithPolicyHolder: ClaimWithPolicyHolder = {
          ...response,
          policy_holder: policyHolder
        };
        setClaims((prev: ClaimWithPolicyHolder[]) => [newClaimWithPolicyHolder, ...prev]);
      } else {
        // Reload claims to get proper policy holder data
        await loadClaims();
      }
      // Reset form
      setNewClaimData({
        claim_id: '',
        policy_holder_id: 0,
        date_filed: new Date(),
        claim_type: 'AUTO',
        status: 'PENDING',
        amount: 0,
        description: null
      });
    } catch (error) {
      console.error('Failed to create claim:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle creating new policy holder
  const handleCreatePolicyHolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createPolicyHolder.mutate(newPolicyHolderData);
      setPolicyHolders((prev: PolicyHolder[]) => [...prev, response]);
      // Reset form
      setNewPolicyHolderData({
        name: '',
        policy_number: '',
        email: '',
        phone: '',
        address: '',
        date_of_birth: new Date()
      });
    } catch (error) {
      console.error('Failed to create policy holder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.updateInsuranceClaim.mutate(statusUpdate);
      // Update local state
      setClaims((prev: ClaimWithPolicyHolder[]) => 
        prev.map((claim: ClaimWithPolicyHolder) => 
          claim.id === statusUpdate.id 
            ? { ...claim, status: statusUpdate.status || claim.status }
            : claim
        )
      );
      setSelectedClaim(null);
    } catch (error) {
      console.error('Failed to update claim status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🛡️ Insurance Claims Dashboard</h1>
          <p className="text-gray-600">Manage claims and policy holders efficiently</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="claims" className="text-lg">📋 Claims Management</TabsTrigger>
            <TabsTrigger value="policyholders" className="text-lg">👥 Policy Holders</TabsTrigger>
          </TabsList>

          {/* Claims Tab */}
          <TabsContent value="claims" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">Insurance Claims</h2>
              
              {/* New Claim Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    ➕ New Claim
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Insurance Claim</DialogTitle>
                    <DialogDescription>
                      Fill in the details to create a new insurance claim.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateClaim} className="space-y-4">
                    <div>
                      <Label htmlFor="claim_id">Claim ID</Label>
                      <Input
                        id="claim_id"
                        value={newClaimData.claim_id}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewClaimData((prev: CreateInsuranceClaimInput) => ({ ...prev, claim_id: e.target.value }))
                        }
                        placeholder="CLM-2024-001"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="policy_holder">Policy Holder</Label>
                      <Select 
                        value={newClaimData.policy_holder_id.toString()}
                        onValueChange={(value: string) =>
                          setNewClaimData((prev: CreateInsuranceClaimInput) => ({ ...prev, policy_holder_id: parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a policy holder" />
                        </SelectTrigger>
                        <SelectContent>
                          {policyHolders.map((ph: PolicyHolder) => (
                            <SelectItem key={ph.id} value={ph.id.toString()}>
                              {ph.name} - {ph.policy_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="claim_type">Claim Type</Label>
                      <Select 
                        value={newClaimData.claim_type}
                        onValueChange={(value: 'AUTO' | 'HOME' | 'LIFE' | 'HEALTH' | 'PROPERTY' | 'LIABILITY') =>
                          setNewClaimData((prev: CreateInsuranceClaimInput) => ({ ...prev, claim_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AUTO">Auto</SelectItem>
                          <SelectItem value="HOME">Home</SelectItem>
                          <SelectItem value="LIFE">Life</SelectItem>
                          <SelectItem value="HEALTH">Health</SelectItem>
                          <SelectItem value="PROPERTY">Property</SelectItem>
                          <SelectItem value="LIABILITY">Liability</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="amount">Claim Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={newClaimData.amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewClaimData((prev: CreateInsuranceClaimInput) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                        }
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newClaimData.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setNewClaimData((prev: CreateInsuranceClaimInput) => ({ ...prev, description: e.target.value || null }))
                        }
                        placeholder="Describe the claim..."
                      />
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Creating...' : 'Create Claim'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Claims Grid */}
            {claims.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-gray-500 text-lg">No claims found. Create your first claim above!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {claims.map((claim: ClaimWithPolicyHolder) => (
                  <Card key={claim.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <span>📋 {claim.claim_id}</span>
                            <Badge className={getStatusColor(claim.status)}>
                              {claim.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            Filed: {claim.date_filed.toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ${claim.amount.toLocaleString()}
                          </p>
                          <Badge className={getClaimTypeColor(claim.claim_type)}>
                            {claim.claim_type}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-2">👤 Policy Holder</h4>
                          <p className="font-medium">{claim.policy_holder.name}</p>
                          <p className="text-sm text-gray-600">{claim.policy_holder.policy_number}</p>
                          <p className="text-sm text-gray-600">{claim.policy_holder.email}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-2">📝 Description</h4>
                          <p className="text-sm text-gray-600">
                            {claim.description || 'No description provided'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedClaim(claim)}
                        >
                          Update Status
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPolicyHolder(claim.policy_holder)}
                        >
                          View Policy Holder
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Policy Holders Tab */}
          <TabsContent value="policyholders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">Policy Holders</h2>
              
              {/* New Policy Holder Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    ➕ New Policy Holder
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Policy Holder</DialogTitle>
                    <DialogDescription>
                      Add a new policy holder to the system.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreatePolicyHolder} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={newPolicyHolderData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPolicyHolderData((prev: CreatePolicyHolderInput) => ({ ...prev, name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="policy_number">Policy Number</Label>
                      <Input
                        id="policy_number"
                        value={newPolicyHolderData.policy_number}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPolicyHolderData((prev: CreatePolicyHolderInput) => ({ ...prev, policy_number: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newPolicyHolderData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPolicyHolderData((prev: CreatePolicyHolderInput) => ({ ...prev, email: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newPolicyHolderData.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPolicyHolderData((prev: CreatePolicyHolderInput) => ({ ...prev, phone: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={newPolicyHolderData.address}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setNewPolicyHolderData((prev: CreatePolicyHolderInput) => ({ ...prev, address: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={newPolicyHolderData.date_of_birth.toISOString().split('T')[0]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPolicyHolderData((prev: CreatePolicyHolderInput) => ({ ...prev, date_of_birth: new Date(e.target.value) }))
                        }
                        required
                      />
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Creating...' : 'Create Policy Holder'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Policy Holders Table */}
            {policyHolders.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-6xl mb-4">👥</div>
                  <p className="text-gray-500 text-lg">No policy holders found. Add one above!</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Policy Number</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policyHolders.map((ph: PolicyHolder) => (
                      <TableRow key={ph.id}>
                        <TableCell className="font-medium">{ph.name}</TableCell>
                        <TableCell>{ph.policy_number}</TableCell>
                        <TableCell>{ph.email}</TableCell>
                        <TableCell>{ph.phone}</TableCell>
                        <TableCell>{ph.date_of_birth.toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPolicyHolder(ph)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Status Update Dialog */}
        {selectedClaim && (
          <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Claim Status</DialogTitle>
                <DialogDescription>
                  Update the status for claim {selectedClaim.claim_id}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleStatusUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="status">New Status</Label>
                  <Select 
                    value={statusUpdate.status || selectedClaim.status}
                    onValueChange={(value: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INVESTIGATING' | 'SETTLED') => {
                      setStatusUpdate({
                        id: selectedClaim.id,
                        status: value
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="SETTLED">Settled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Updating...' : 'Update Status'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setSelectedClaim(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Policy Holder Details Dialog */}
        {selectedPolicyHolder && (
          <Dialog open={!!selectedPolicyHolder} onOpenChange={() => setPolicyHolder(null)}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>👤 Policy Holder Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Name</Label>
                    <p className="text-lg font-semibold">{selectedPolicyHolder.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Policy Number</Label>
                    <p className="text-lg font-semibold">{selectedPolicyHolder.policy_number}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p>{selectedPolicyHolder.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Phone</Label>
                    <p>{selectedPolicyHolder.phone}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Address</Label>
                  <p>{selectedPolicyHolder.address}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Date of Birth</Label>
                  <p>{selectedPolicyHolder.date_of_birth.toLocaleDateString()}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Member Since</Label>
                  <p>{selectedPolicyHolder.created_at.toLocaleDateString()}</p>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setPolicyHolder(null)}
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

export default App;